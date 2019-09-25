import Cart from "./models/Cart";
import {DataObject} from "../../common/main/metacore";

export const actionTypes = {
	ERROR: 'ERROR',
//	INIT: 'INIT',
	LOAD_ERROR: 'LOAD_ERROR',
	RESTORE_FROM_HISTORY: 'RESTORE_FROM_HISTORY',
	SPECTABLES_FETCHED: 'SPECTABLES_FETCHED',
	SPEC_FILTER_UPDATED: 'SPEC_FILTER_UPDATED',
	SPEC_FILTER_RESET: 'SPEC_FILTER_RESET',
	OBJECTS_FETCHED: 'OBJECTS_FETCHED',
	SORTING_TOGGLED: 'SORTING_TOGGLED',
	STEP_REQUESTED: 'STEP_REQUESTED',
	PREVIEW: 'PREVIEW',
	PREVIEW_VISIBILITY: 'PREVIEW_VISIBILITY',
	PREVIEW_SETTING_UPDATED: 'PREVIEW_SETTING_UPDATED',
	ITEM_URL_UPDATED: 'ITEM_URL_UPDATED',
	ROUTE_UPDATED: 'ROUTE_UPDATED',
	SWITCH_TAB: 'SWITCH_TAB',
	RESTORE_FILTERS: 'RESTORE_FILTERS',
	RESTORE_PREVIEW: 'RESTORE_PREVIEW',
	CART_UPDATED: 'CART_UPDATED',
	WHOAMI_FETCHED: 'WHOAMI_FETCHED',
	EXTENDED_DOBJ_INFO_FETCHED: 'EXTENDED_DOBJ_INFO_FETCHED',
	USER_INFO_FETCHED: 'USER_INFO_FETCHED',
	TESTED_BATCH_DOWNLOAD: 'TESTED_BATCH_DOWNLOAD',
	TEMPORAL_FILTER: 'TEMPORAL_FILTER',
	FREE_TEXT_FILTER: 'FREE_TEXT_FILTER',
	UPDATE_SELECTED_PIDS: 'UPDATE_SELECTED_PIDS',
	UPDATE_SELECTED_IDS: 'UPDATE_SELECTED_IDS',
	UPDATE_CHECKED_OBJECTS_IN_SEARCH: 'UPDATE_CHECKED_OBJECTS_IN_SEARCH',
	UPDATE_CHECKED_OBJECTS_IN_CART: 'UPDATE_CHECKED_OBJECTS_IN_CART',
	TS_SETTINGS: 'TS_SETTINGS',
	HELP_INFO_UPDATED: 'HELP_INFO_UPDATED'
};

import stateUtils from "./models/State";
import {fetchAllSpecTables, searchDobjs, getCart, saveCart, logOut, fetchResourceHelpInfo, getMetadata} from './backend';
import {getIsBatchDownloadOk, getWhoIam, getProfile, getError, getTsSettings, saveTsSetting} from './backend';
import {getExtendedDataObjInfo} from './backend';
import {areFiltersEnabled} from './reducer';
import {DataObjectsFetcher, CachedDataObjectsFetcher} from "./CachedDataObjectsFetcher";
import {restoreCarts} from './models/Cart';
import CartItem from './models/CartItem';
import {getNewTimeseriesUrl, getRouteFromLocationHash} from './utils';
import config from './config';
import {saveToRestheart} from "../../common/main/backend";
import {Action} from "redux";
import {IPortalThunkAction, PortalDispatch} from "./store";
import {KeyStrVal, Sha256Str, UrlStr} from "./backend/declarations";

export abstract class ActionPayload{}
export abstract class BackendPayload extends ActionPayload{}
export abstract class MiscPayload extends ActionPayload{}


export interface IPortalPlainAction extends Action<string>{
	payload: ActionPayload
}

export class BackendUserInfo extends BackendPayload{
	constructor(readonly user: User, readonly profile: object){super();}
}

export class BackendTables extends BackendPayload{
	constructor(readonly allTables: object){super();}
}

export class BackendObjectMetadataId extends BackendPayload{
	constructor(readonly id: UrlStr){super();}
}

export class BackendObjectMetadata extends BackendPayload{
	constructor(readonly metadata: DataObject & {id: UrlStr}){super();}
}

export class MiscError extends MiscPayload{
	constructor(readonly error: Error){super();}
}

export class MiscInit extends MiscPayload{
	constructor(){super();}
}

const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

interface User{
	email: string | undefined;
}

export const failWithError: (dispatch: PortalDispatch) => (error: Error) => void = dispatch => error => {
	dispatch(new MiscError(error));
	dispatch(logError(error));
};

const logError: (error: Error) => IPortalThunkAction<void> = error => (_, getState) => {
	const state: any = getState();
	const user = state.user.email
		? `${state.user.profile.profile.givenName} ${state.user.profile.profile.surname}`
		: undefined;

	saveToRestheart({
		error: {
			app: 'portal',
			message: error.message,
			state: JSON.stringify(Object.assign({}, stateUtils.serialize(state), {user, cart: state.cart})),
			url: decodeURI(window.location.href)
		}
	});
};

export const init: IPortalThunkAction<void> = dispatch => {
	const stateFromHash = stateUtils.hashToState();

	getWhoIam().then((user: User) => {
		if (stateFromHash.error){
			if (user.email) logOut();
			dispatch(loadFromError(user, stateFromHash.error));

		} else {
			dispatch(loadApp(user));
		}
	});
};

const loadApp: (user: User) => IPortalThunkAction<void> = user => dispatch => {
	dispatch(new MiscInit());

	getProfile(user.email).then(profile => {
		dispatch(new BackendUserInfo(user, profile));
		dispatch(getTsPreviewSettings());
	});

	getCart(user.email).then(
		({cartInSessionStorage, cartInRestheart}) => {

			cartInRestheart.then(restheartCart => {
				const cart = restoreCarts(cartInSessionStorage, restheartCart);

				dispatch(updateCart(user.email, cart))
					.then(() => dispatch(getAllSpecTables));
			});
		}
	);
};

const loadFromError = (user: any, errorId: string) => (dispatch: Function) => {
	getError(errorId).then(response => {
		if (response && response.error && response.error.state) {
			const stateJSON = JSON.parse(response.error.state);
			const objectsTable = stateJSON.objectsTable.map((ot: any) => {
				return Object.assign(ot, {
					submTime: new Date(ot.submTime),
					timeStart: new Date(ot.timeStart),
					timeEnd: new Date(ot.timeEnd)
				});
			});
			const cart = restoreCarts({cart: stateJSON.cart}, {cart: new Cart()});
			const state = Object.assign({},
				stateJSON,
				{objectsTable, ts: undefined, user: {}}
			);

			dispatch({
				type: actionTypes.LOAD_ERROR,
				state,
				cart
			});
		} else {
			dispatch(loadApp(user));
		}
	});
};

export const restoreFromHistory = (historyState: any) => (dispatch: Function) => {
	if (Date.now() - historyState.ts < config.historyStateMaxAge) {
		dispatch({
			type: actionTypes.RESTORE_FROM_HISTORY,
			historyState
		});
		dispatch(addStateMisingInHistory);
	} else {
		dispatch(init);
	}
};

const addStateMisingInHistory = (dispatch: Function, getState: Function) => {
	const {route, metadata, id}:
		{route: string, metadata: DataObject & {id: UrlStr}, id: UrlStr} = getState();

	if (route === config.ROUTE_METADATA && metadata.id !== id) dispatch(setMetadataItem(id));
};

export const getAllSpecTables: IPortalThunkAction<void> = dispatch => {
	fetchAllSpecTables().then(
		allTables => {
			dispatch(Object.assign({type: actionTypes.SPECTABLES_FETCHED}, allTables));
			dispatch({type: actionTypes.RESTORE_FILTERS});
			dispatch(getFilteredDataObjects);
		},
		failWithError(dispatch)
	);
};


export const queryMeta: (id: string, search: string) => IPortalThunkAction<void> = (id, search) => dispatch => {
	switch (id) {
		case "dobj":
			searchDobjs(search).then(data => dispatchMeta(id, data, dispatch));
			break;

		default:
			failWithError(dispatch)(new Error(`Could not find a method matching ${id} to query metadata`));
	}
};

const dispatchMeta = (id: string, data: any, dispatch: Function) => {
	dispatch({
		type: actionTypes.FREE_TEXT_FILTER,
		id,
		data
	});

	if (id === 'dobj' && (data.length === 0 || data.length === 1)){
		dispatch(getFilteredDataObjects);
	}
};

export const updateSelectedPids = (selectedPids: string[]) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.UPDATE_SELECTED_PIDS,
		selectedPids
	});

	dispatch(getFilteredDataObjects);
};

export const updateCheckedObjectsInSearch = (checkedObjectInSearch: CartItem) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.UPDATE_CHECKED_OBJECTS_IN_SEARCH,
		checkedObjectInSearch
	});
};

export const updateCheckedObjectsInCart = (checkedObjectInCart: CartItem) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.UPDATE_CHECKED_OBJECTS_IN_CART,
		checkedObjectInCart
	});
};

export const specFilterUpdate = (varName: string, values: string[]) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.SPEC_FILTER_UPDATED,
		varName,
		values
	});
	dispatch(getFilteredDataObjects);
};

const logPortalUsage = (specTable: any, filterCategories: any, filterTemporal: any, filterFreeText: any) => {
	if (Object.keys(filterCategories).length || filterTemporal.hasFilter || filterFreeText.hasFilter) {

		const filters = Object.keys(filterCategories).reduce<KeyStrVal>((acc: KeyStrVal, columnName: string) => {
			acc[columnName] = specTable.getLabelFilter(columnName);
			return acc;
		}, {});

		if (filterTemporal.hasFilter) filters.filterTemporal = filterTemporal.serialize;
		if (filterFreeText.hasFilter) filters.filterFreeText = filterFreeText.serialize;

		saveToRestheart({
			filterChange: {
				filters
			}
		});
	}
};

export const getFilteredDataObjects = (dispatch: Function, getState: Function) => {
	dispatch(getFilteredDataObjectsWithoutUsageLogging);

	const {route, specTable, filterCategories, filterTemporal, filterFreeText} = getState();

	if (route === undefined || route === config.ROUTE_SEARCH) {
		logPortalUsage(specTable, filterCategories, filterTemporal, filterFreeText);
	}

};

const getFilteredDataObjectsWithoutUsageLogging: IPortalThunkAction<void> = (dispatch, getState) => {
	const state: any = getState();
	const {specTable, route, preview, sorting, formatToRdfGraph,
		tabs, filterTemporal, filterFreeText, cart, id} = state;

	const getFilters = () => {
		if (route === config.ROUTE_METADATA && id) {
			return [{category: 'pids', pids: [id.split('/').pop()]}];

		} else if (route === config.ROUTE_PREVIEW && preview.hasPids){
			return [{category: 'pids', pids: preview.pids}];

		} else if (route === config.ROUTE_CART) {
			return [{
				category: 'pids',
				pids: cart.ids.map((id: string) => id.split('/').pop())
			}];

		} else if (areFiltersEnabled(tabs, filterTemporal, filterFreeText)) {
			return filterTemporal.filters.concat([{category: 'pids', pids: filterFreeText.selectedPids}]);

		} else {
			return [];
		}
	};

	const filters = getFilters();

	const specs = route === config.ROUTE_CART
		? []
		: specTable.getSpeciesFilter(null);

	const stations = route === config.ROUTE_CART
		? []
		: specTable.getFilter('station');

	const submitters = route === config.ROUTE_CART
		? []
		: specTable.getFilter('submitter');

	const rdfGraphs = route === config.ROUTE_CART
		? []
		: specTable.getColumnValuesFilter('format').map((f: string) => formatToRdfGraph[f]);

	const paging = route === config.ROUTE_CART
		? {offset: 0, limit: cart.ids.length}
		: state.paging;

	const options = {specs, stations, submitters, sorting, paging, rdfGraphs, filters};

	interface FetchedDataObj {
		rows: any,
		cacheSize: number,
		isDataEndReached: boolean
	}

	if (route === config.ROUTE_CART) {
		const cartItems: CartItem[] = cart.items;
		const rows = cartItems.map(ci => ci.item);
		const dobjs = rows.map(r => r.dobj);

		dispatch(fetchExtendedDataObjInfo(dobjs));

		dispatch({
			type: actionTypes.OBJECTS_FETCHED,
			objectsTable: rows,
			cacheSize: rows.length,
			isDataEndReached: true
		});
	} else {
		dataObjectsFetcher.fetch(options).then(
			({rows, cacheSize, isDataEndReached}: FetchedDataObj) => {
				dispatch(fetchExtendedDataObjInfo(rows.map((d: any) => d.dobj)));

				dispatch({
					type: actionTypes.OBJECTS_FETCHED,
					objectsTable: rows,
					cacheSize,
					isDataEndReached
				});
				if (route === config.ROUTE_METADATA) dispatch(setMetadataItem(id));
				if (route === config.ROUTE_PREVIEW) dispatch({type: actionTypes.RESTORE_PREVIEW});
			},
			failWithError(dispatch)
		);
	}
};

const fetchExtendedDataObjInfo: (dobjs: string[]) => IPortalThunkAction<void> = dobjs => dispatch => {
	getExtendedDataObjInfo(dobjs).then(
		extendedDobjInfo => {
			dispatch({
				type: actionTypes.EXTENDED_DOBJ_INFO_FETCHED,
				extendedDobjInfo
			});
		},
		failWithError(dispatch)
	);
};

export const specFiltersReset = (dispatch: Function) => {
	dispatch({type: actionTypes.SPEC_FILTER_RESET});
	dispatch(getFilteredDataObjects);
};

export const toggleSort = (varName: string) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.SORTING_TOGGLED,
		varName
	});
	dispatch(getFilteredDataObjectsWithoutUsageLogging);
};

export const requestStep = (direction: number) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.STEP_REQUESTED,
		direction
	});
	dispatch(getFilteredDataObjectsWithoutUsageLogging);
};

export const updateRoute = (route: string) => (dispatch: Function, getState: Function) => {
	const state = getState();
	const newRoute = route || getRouteFromLocationHash() || config.ROUTE_SEARCH;

	dispatch({
		type: actionTypes.ROUTE_UPDATED,
		route: newRoute
	});

	if (newRoute === config.ROUTE_CART && state.route !== newRoute){
		dispatch(getFilteredDataObjects);

	} else if (newRoute === config.ROUTE_SEARCH && state.route === config.ROUTE_CART){
		dispatch(getFilteredDataObjects);
	}
};

export const switchTab = (tabName: string, selectedTabId: string) => (dispatch: Function) => {

	dispatch({
		type: actionTypes.SWITCH_TAB,
		tabName,
		selectedTabId
	});

	if (tabName === 'searchTab'){
		dispatch(getFilteredDataObjects);
	}
};

export const setMetadataItem: (id: UrlStr) => IPortalThunkAction<void> = id => dispatch => {
	dispatch(new BackendObjectMetadataId(id));

	getMetadata(id).then(metadata => {
		const metadataWithId = Object.assign({}, metadata, {id});
		dispatch(new BackendObjectMetadata(metadataWithId));
	});
};

export const setPreviewItem = (id: string) => (dispatch: Function) => {
	dispatch(getTsPreviewSettings()).then(() => {
		dispatch({
			type: actionTypes.PREVIEW,
			id
		});
	});
};

const getTsPreviewSettings = () => (dispatch: Function, getState: Function) => {
	const user = getState().user;

	return getTsSettings(user.email).then(tsSettings => {
		dispatch({
			type: actionTypes.TS_SETTINGS,
			tsSettings
		});
	});
};

export const storeTsPreviewSetting = (spec: any, type: string, val: any) => (dispatch: Function, getState: Function) => {
	const user = getState().user;

	saveTsSetting(user.email, spec, type, val).then(tsSettings => {
		dispatch({
			type: actionTypes.TS_SETTINGS,
			tsSettings
		});
	});
};

export const setPreviewUrl = (url: string) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.ITEM_URL_UPDATED,
		url
	});
};

export const setCartName = (newName: string) => (dispatch: Function, getState: Function) => {
	const state = getState();

	dispatch(updateCart(state.user.email, state.cart.withName(newName)));
};

export const addToCart: (ids: string[]) => IPortalThunkAction<void> = ids => (dispatch, getState) => {
	const state: any = getState();
	const cart = state.cart;

	const newItems = ids.filter(id => !state.cart.hasItem(id)).map(id => {
		const objInfo = state.objectsTable.find((o: any) => o.dobj === id);
		const specLookup = state.lookup.getSpecLookup(objInfo.spec);
		const type = specLookup ? specLookup.type : undefined;
		const xAxis = specLookup && specLookup.type === config.TIMESERIES
			? specLookup.options.find((ao: string) => ao === 'TIMESTAMP')
			: undefined;
		const item = new CartItem(objInfo, type);

		return xAxis
			? item.withUrl(getNewTimeseriesUrl([item], xAxis))
			: item;
	});

	if (newItems.length > 0) {
		dispatch(updateCart(state.user.email, cart.addItem(newItems)));
	}
};

export const removeFromCart: (ids: string[]) => IPortalThunkAction<void> = ids => (dispatch, getState) => {
	const state: any = getState();
	const cart = state.cart.removeItems(ids);

	dispatch(updateCart(state.user.email, cart));
};

function updateCart(email: string | undefined, cart: Cart): IPortalThunkAction<Promise<any>> {
	return dispatch => saveCart(email, cart).then(() =>
		dispatch({
			type: actionTypes.CART_UPDATED,
			cart
		})
	);
};

export const fetchIsBatchDownloadOk: IPortalThunkAction<void> = dispatch => {
	Promise.all([getIsBatchDownloadOk(), getWhoIam()])
		.then(
			([isBatchDownloadOk, user]) => dispatch({
				type: actionTypes.TESTED_BATCH_DOWNLOAD,
				isBatchDownloadOk,
				user
			}),
			err => dispatch(failWithError(err))
		);
};

export const setFilterTemporal: (filterTemporal: any) => IPortalThunkAction<void> = filterTemporal => dispatch => {
	if (filterTemporal.dataTime.error) {
		failWithError(dispatch)(new Error(filterTemporal.dataTime.error));
	}
	if (filterTemporal.submission.error) {
		failWithError(dispatch)(new Error(filterTemporal.submission.error));
	}

	dispatch({
		type: actionTypes.TEMPORAL_FILTER,
		filterTemporal
	} as Action<string>);

	if (filterTemporal.dataTime.error || filterTemporal.submission.error) return;

	dispatch(getFilteredDataObjects);
};

export const getResourceHelpInfo: (helpItem: any) => IPortalThunkAction<void> = helpItem => (dispatch, getState) => {
	if (helpItem.shouldFetchList) {
		const {specTable} = getState() as any;
		const uriList = specTable
			.getAllDistinctAvailableColValues(helpItem.name)
			.filter((uri: string) => uri);

		if (uriList.length) {
			fetchResourceHelpInfo(uriList).then(resourceInfo => {
				dispatch(updateHelpInfo(helpItem.withList(resourceInfo)));
			});
		} else {
			dispatch(updateHelpInfo(helpItem));
		}
	} else {
		dispatch(updateHelpInfo(helpItem));
	}
};

const updateHelpInfo: (helpItem: any) => IPortalThunkAction<void> = helpItem => dispatch => {
	dispatch({
		type: actionTypes.HELP_INFO_UPDATED,
		helpItem
	});
};
