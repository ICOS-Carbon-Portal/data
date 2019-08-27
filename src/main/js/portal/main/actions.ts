import Cart from "./models/Cart";

export const actionTypes = {
	ERROR: 'ERROR',
	INIT: 'INIT',
	LOAD_ERROR: 'LOAD_ERROR',
	RESTORE_FROM_HISTORY: 'RESTORE_FROM_HISTORY',
	SPECTABLES_FETCHED: 'SPECTABLES_FETCHED',
	SPEC_FILTER_UPDATED: 'SPEC_FILTER_UPDATED',
	SPEC_FILTER_RESET: 'SPEC_FILTER_RESET',
	OBJECTS_FETCHED: 'OBJECTS_FETCHED',
	SORTING_TOGGLED: 'SORTING_TOGGLED',
	STEP_REQUESTED: 'STEP_REQUESTED',
	METADATA: 'METADATA',
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

import State, {hashToState} from "./models/State";
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
import {IKeyValStrPairs} from "./typescript/interfaces";
import {Action, Dispatch} from "redux";
import {ThunkAction, ThunkDispatch} from "redux-thunk";

interface IPortalThunkAction<R> extends ThunkAction<R, State, undefined, PortalAction>{}
type PortalDispatch = ThunkDispatch<State, undefined, PortalAction>

abstract class PortalAction implements Action<undefined>{
	type: undefined;
}

abstract class BackendFetchAction extends PortalAction{}
abstract class MiscellaneousAction extends PortalAction{}

class WhoAmiFetchedAction extends BackendFetchAction{
	constructor(readonly whoAmi: object){super();}
}

class TablesFetchedAction extends BackendFetchAction{
	constructor(readonly allTables: object){super();}
}

class ErrorAction extends MiscellaneousAction{
	constructor(readonly error: Error){super();}
}

class InitAction extends MiscellaneousAction{
	constructor(){super();}
}

const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();


export const failWithError: (dispatch: PortalDispatch) => (error: Error) => void = dispatch => error =>{
	dispatch(new ErrorAction(error));
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
			state: JSON.stringify(Object.assign({}, state.serialize, {user, cart: state.cart})),
			url: decodeURI(window.location.href)
		}
	});
};

export const init = () => (dispatch: Function) => {
	const stateFromHash = hashToState();

	getWhoIam().then((user: any) => {
		if (stateFromHash.error){
			if (user.email) logOut();
			dispatch(loadFromError(user, stateFromHash.error));

		} else {
			dispatch(loadApp(user));
		}
	});
};

const loadApp:  (user: any) => IPortalThunkAction<void> = user => dispatch => {
	dispatch(new InitAction());

	getProfile(user.email).then(profile => {
		dispatch({
			type: actionTypes.USER_INFO_FETCHED,
			user,
			profile
		});

		dispatch(getTsPreviewSettings());
	});

	getCart(user.email).then(
		({cartInSessionStorage, cartInRestheart}) => {

			cartInRestheart.then(restheartCart => {
				const cart = restoreCarts(cartInSessionStorage, restheartCart);

				dispatch(updateCart(user.email, cart))
					.then(() => dispatch(getAllSpecTables()));
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
	} else {
		dispatch(init());
	}
};

export const getAllSpecTables: IPortalThunkAction<void> = (dispatch, _) => {
	fetchAllSpecTables().then(
		allTables => {
			dispatch(Object.assign({type: actionTypes.SPECTABLES_FETCHED}, allTables));
			dispatch({type: actionTypes.RESTORE_FILTERS});
			dispatch(getFilteredDataObjects);
		},
		failWithError(dispatch)
	);
};


export const queryMeta = (id: string, search: string) => (dispatch: Function) => {
	switch (id) {
		case "dobj":
			searchDobjs(search).then((data: any) => dispatchMeta(id, data, dispatch));
			break;

		default:
			failWithError(dispatch)(new Error(`Could not find a method matching ${id} to query metadata`));
			// dispatch(failWithError({message: `Could not find a method matching ${id} to query metadata`}));
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

		const filters = Object.keys(filterCategories).reduce<IKeyValStrPairs>((acc: IKeyValStrPairs, columnName: string) => {
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

const getFilteredDataObjectsWithoutUsageLogging = (dispatch: Function, getState: Function) => {
	const {specTable, route, preview, sorting, formatToRdfGraph,
		tabs, filterTemporal, filterFreeText, cart, metadata} = getState();

	const getFilters = () => {
		if (route === config.ROUTE_METADATA && metadata.id) {
			return [{category: 'pids', pids: [metadata.id.split('/').pop()]}];

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
		: getState().paging;

	const options = {specs, stations, submitters, sorting, paging, rdfGraphs, filters};

	interface IFetchedDataObj {
		rows: any,
		cacheSize: number,
		isDataEndReached: boolean
	}

	dataObjectsFetcher.fetch(options).then(
		({rows, cacheSize, isDataEndReached}: IFetchedDataObj) => {

			dispatch(fetchExtendedDataObjInfo(rows.map((d: any) => d.dobj)));

			dispatch({
				type: actionTypes.OBJECTS_FETCHED,
				objectsTable: rows,
				cacheSize,
				isDataEndReached
			});
			if (route === config.ROUTE_METADATA) dispatch(setMetadataItem(metadata.id));
			if (route === config.ROUTE_PREVIEW) dispatch({type: actionTypes.RESTORE_PREVIEW});
		},
		failWithError(dispatch)
	);
};

const fetchExtendedDataObjInfo = (dobjs: string[]) => (dispatch: Function) => {
	getExtendedDataObjInfo(dobjs).then(
		(extendedDobjInfo: any) => {
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

export const setMetadataItem = (id: string) => (dispatch: Function) => {
	getMetadata(id).then(metadata => {
		const metadataWithId = Object.assign({}, metadata, {id: id});
		dispatch({
			type: actionTypes.METADATA,
			metadataWithId
		});
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

export const addToCart = (ids: string[]) => (dispatch: Function, getState: Function) => {
	const state = getState();
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

export const removeFromCart = (ids: string[]) => (dispatch: Function, getState: Function) => {
	const state = getState();
	const cart = state.cart.removeItems(ids);

	dispatch(updateCart(state.user.email, cart));
};

const updateCart = (email: string, cart: Cart) => (dispatch: Function) => {
	return saveCart(email, cart).then(
		dispatch({
			type: actionTypes.CART_UPDATED,
			cart
		})
	);
};

export const fetchIsBatchDownloadOk = (dispatch: Function) => {
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

export const setFilterTemporal = (filterTemporal: any) => (dispatch: Function) => {
	if (filterTemporal.dataTime.error) {
		failWithError(dispatch)(new Error(filterTemporal.dataTime.error));
	}
	if (filterTemporal.submission.error) {
		failWithError(dispatch)(new Error(filterTemporal.submission.error));
	}

	dispatch({
		type: actionTypes.TEMPORAL_FILTER,
		filterTemporal
	});

	if (filterTemporal.dataTime.error || filterTemporal.submission.error) return;

	dispatch(getFilteredDataObjects);
};

export const getResourceHelpInfo = (helpItem: any) => (dispatch: Function, getState: Function) => {
	if (helpItem.shouldFetchList) {
		const {specTable} = getState();
		const uriList = specTable
			.getAllDistinctAvailableColValues(helpItem.name)
			.filter((uri: string) => uri);

		if (uriList.length) {
			fetchResourceHelpInfo(uriList).then((resourceInfo: any) => {
				dispatch(updateHelpInfo(helpItem.withList(resourceInfo)));
			});
		} else {
			dispatch(updateHelpInfo(helpItem));
		}
	} else {
		dispatch(updateHelpInfo(helpItem));
	}
};

const updateHelpInfo = (helpItem: any) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.HELP_INFO_UPDATED,
		helpItem
	});
};
