import Cart from "./models/Cart";
export const actionTypes = {
	ERROR: 'ERROR',
	LOAD_ERROR: 'LOAD_ERROR',
	RESTORE_FROM_HISTORY: 'RESTORE_FROM_HISTORY',
	SPECTABLES_FETCHED: 'SPECTABLES_FETCHED',
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

import stateUtils, {MetaDataObject, Profile, State, User, SearchOptions} from "./models/State";
import {
	fetchAllSpecTables,
	searchDobjs,
	getCart,
	saveCart,
	logOut,
	fetchResourceHelpInfo,
	getMetadata,
	fetchKnownDataObjects, fetchDobjOriginsAndCounts, fetchFilteredDataObjects
} from './backend';
import {getIsBatchDownloadOk, getWhoIam, getProfile, getError, getTsSettings, saveTsSetting} from './backend';
import {getExtendedDataObjInfo} from './backend';
import {isPidFreeTextSearch} from './reducer';
import {DataObjectsFetcher, CachedDataObjectsFetcher} from "./CachedDataObjectsFetcher";
import {restoreCarts} from './models/Cart';
import CartItem from './models/CartItem';
import {getNewTimeseriesUrl, getRouteFromLocationHash} from './utils';
import config from './config';
import {saveToRestheart} from "../../common/main/backend";
import {PortalThunkAction, PortalDispatch} from "./store";
import {KeyStrVal, Sha256Str, ThenArg, UrlStr} from "./backend/declarations";
import {Item} from "./models/HelpStorage";
import FilterTemporal from "./models/FilterTemporal";
import {DeprecatedFilterRequest, FilterRequest, PidFilterRequest, TemporalFilterRequest} from "./models/FilterRequest";
import CompositeSpecTable, {ColNames} from "./models/CompositeSpecTable";
import Paging from "./models/Paging";
import {
	BackendObjectMetadata,
	BackendObjectMetadataId, BackendObjectsFetched,
	BackendOriginsTable, BackendTables, BackendUpdateSpecFilter,
	BackendUserInfo,
	MiscError,
	MiscInit, MiscResetFilters,
	MiscUpdateSearchOption
} from "./reducers/actionpayloads";
import {Value} from "./models/SpecTable";

const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export const failWithError: (dispatch: PortalDispatch) => (error: Error) => void = dispatch => error => {
	dispatch(new MiscError(error));
	dispatch(logError(error));
};

const logError: (error: Error) => PortalThunkAction<void> = error => (_, getState) => {
	const state: State = getState();
	const user = state.user;
	const profile = user.profile;
	const userName = user.email
		? `${(profile as Profile).givenName} ${(profile as Profile).surname}`
		: undefined;

	saveToRestheart({
		error: {
			app: 'portal',
			message: error.message,
			state: JSON.stringify(Object.assign({}, stateUtils.serialize(state), {user: userName, cart: state.cart})),
			url: decodeURI(window.location.href)
		}
	});
};

export const init: PortalThunkAction<void> = dispatch => {
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

const loadApp: (user: User) => PortalThunkAction<void> = user => (dispatch, getState) => {
	dispatch(new MiscInit());

	type LoggedIn = {_id: string, profile: Profile | {}};

	getProfile(user.email).then((resp: {} | LoggedIn) => {
		const profile = (resp as LoggedIn).profile || {};

		dispatch(new BackendUserInfo(user, profile));
		dispatch(getTsPreviewSettings());
	});

	getCart(user.email).then(
		({cartInSessionStorage, cartInRestheart}) => {

			cartInRestheart.then(restheartCart => {
				const cart = restoreCarts(cartInSessionStorage, restheartCart);
				const filters = getFilters(getState());

				dispatch(updateCart(user.email, cart))
					.then(() => dispatch(getAllSpecTables(filters)));
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
		{route: string, metadata: MetaDataObject & {id: UrlStr}, id: UrlStr} = getState();

	if (route === config.ROUTE_METADATA && metadata.id !== id) dispatch(setMetadataItem(id));
};

export const getAllSpecTables: (filters: FilterRequest[]) => PortalThunkAction<void> = filters => (dispatch, getState) => {
	fetchAllSpecTables(filters).then(
		allTables => {
			dispatch(new BackendTables(allTables));
			dispatch({type: actionTypes.RESTORE_FILTERS});

			const {tabs, filterFreeText} = getState();
			const fetchOriginsTable = !isPidFreeTextSearch(tabs, filterFreeText);
			dispatch(getFilteredDataObjects(fetchOriginsTable));
		},
		failWithError(dispatch)
	);
};

const getOriginsTable: PortalThunkAction<void> = (dispatch: PortalDispatch, getState: Function) => {
	const filters = getFilters(getState());

	fetchDobjOriginsAndCounts(filters).then(
		dobjOriginsAndCounts => {
			dispatch(new BackendOriginsTable(dobjOriginsAndCounts));
		},
		failWithError(dispatch)
	);
};

export const queryMeta: (id: string, search: string) => PortalThunkAction<void> = (id, search) => dispatch => {
	switch (id) {
		case "dobj":
			searchDobjs(search).then(data => {
				const dobjs = data.map(d => d.dobj);
				dispatchMeta(id, dobjs, dispatch)
			});
			break;

		default:
			failWithError(dispatch)(new Error(`Could not find a method matching ${id} to query metadata`));
	}
};

const dispatchMeta = (id: string, data: string[], dispatch: Function) => {
	dispatch({
		type: actionTypes.FREE_TEXT_FILTER,
		id,
		data
	});

	if (id === 'dobj' && (data.length === 0 || data.length === 1)){
		dispatch(getFilteredDataObjects(true));
	}
};

export const updateSelectedPids = (selectedPids: Sha256Str[]) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.UPDATE_SELECTED_PIDS,
		selectedPids
	});

	dispatch(getFilteredDataObjects(false));
};

export const updateCheckedObjectsInSearch = (checkedObjectInSearch: UrlStr[]) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.UPDATE_CHECKED_OBJECTS_IN_SEARCH,
		checkedObjectInSearch
	});
};

export const updateCheckedObjectsInCart = (checkedObjectInCart: UrlStr[]) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.UPDATE_CHECKED_OBJECTS_IN_CART,
		checkedObjectInCart
	});
};

export const specFilterUpdate = (varName: ColNames, values: Value[]) => (dispatch: Function) => {
	dispatch(new BackendUpdateSpecFilter(varName, values));
	dispatch(getFilteredDataObjects(false));
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

export const updateFilteredDataObjects = () => (dispatch: Function, getState: Function) => {
	const objectsTable = getState().objectsTable;

	if (objectsTable.length === 0) dispatch(getFilteredDataObjects(true));
};

const getKnownDataObjInfo: (dobjs: string[], cb?: Function) => PortalThunkAction<void> = (dobjs, cb) => (dispatch) => {
	fetchKnownDataObjects(dobjs).then(result => {
			dispatch(new BackendObjectsFetched(result.rows, result.rows.length, true));

			if (cb) dispatch(cb);
		},
		failWithError(dispatch)
	);
};

const restorePreview: PortalThunkAction<void> = (dispatch) => {
	dispatch({type: actionTypes.RESTORE_PREVIEW});
};

const getFilters = (state: State) => {
	const {tabs, filterTemporal, filterFreeText, searchOptions} = state;
	let filters: FilterRequest[] = [];

	if (isPidFreeTextSearch(tabs, filterFreeText)){
		filters.push({category: 'deprecated', allow: true} as DeprecatedFilterRequest);
		filters.push({category: 'pids', pids: filterFreeText.selectedPids} as PidFilterRequest);
	} else {
		filters.push({category: 'deprecated', allow: searchOptions.showDeprecated} as DeprecatedFilterRequest);

		if (filterTemporal.hasFilter){
			filters = filters.concat(filterTemporal.filters as TemporalFilterRequest[]);
		}
	}

	return filters;
};

const getFilteredDataObjects: (fetchOriginsTable: boolean) => PortalThunkAction<void> = (fetchOriginsTable) => (dispatch, getState) => {
	const state: State = getState();
	const {route, cart, id, preview, specTable, filterCategories, filterTemporal, filterFreeText} = state;

	if (route === config.ROUTE_CART) {
		const cartItems: CartItem[] = cart.items;
		const rows = cartItems.map(ci => ci.item);
		const dobjs = rows.map(r => r.dobj);

		dispatch(fetchExtendedDataObjInfo(dobjs));

		dispatch(new BackendObjectsFetched(rows, rows.length, true));

	} else if (route === config.ROUTE_METADATA && id) {
		const hash: Sha256Str | undefined = id.split('/').pop();

		if (hash) {
			dispatch(getKnownDataObjInfo([hash]));
			dispatch(setMetadataItem(id));
		}

	} else if (route === config.ROUTE_PREVIEW && preview.hasPids){
		dispatch(getKnownDataObjInfo(preview.pids, restorePreview));

		let ids = preview.pids.map((id: string) => config.previewIdPrefix[config.envri] + id);
		dispatch(fetchExtendedDataObjInfo(ids));

	} else {
		const {specTable, sorting, paging} = state;
		const formatToRdfGraph: {} & KeyStrVal = state.formatToRdfGraph;
		const filters = getFilters(state);
		const useOnlyPidFilter = filters.some(f => f.category === "pids");

		const options: Options = {
			specs: useOnlyPidFilter ? [] : specTable.getSpeciesFilter(null, true),
			stations: useOnlyPidFilter ? [] : specTable.getFilter('station'),
			submitters: useOnlyPidFilter ? [] : specTable.getFilter('submitter'),
			sorting,
			paging,
			rdfGraphs: useOnlyPidFilter ? [] : specTable.getColumnValuesFilter('format').map((f: Value) => formatToRdfGraph[f!]),
			filters
		};

		interface FetchedDataObj {
			rows: ThenArg<typeof fetchFilteredDataObjects>['rows'],
			cacheSize: number,
			isDataEndReached: boolean
		}

		dataObjectsFetcher.fetch(options).then(
			({rows, cacheSize, isDataEndReached}: FetchedDataObj) => {
				dispatch(fetchExtendedDataObjInfo(rows.map((d) => d.dobj)));
				dispatch(new BackendObjectsFetched(rows, cacheSize, isDataEndReached));
			},
			failWithError(dispatch)
		).then(() => {
			if (fetchOriginsTable) dispatch(getOriginsTable);
		});
	}

	if (route === undefined || route === config.ROUTE_SEARCH) {
		logPortalUsage(specTable, filterCategories, filterTemporal, filterFreeText);
	}
};

export interface Options {
	specs: ReturnType<typeof CompositeSpecTable.prototype.getSpeciesFilter>
	stations: ReturnType<typeof CompositeSpecTable.prototype.getFilter>
	submitters: ReturnType<typeof CompositeSpecTable.prototype.getFilter>
	sorting: State['sorting']
	paging: Paging
	rdfGraphs: ReturnType<typeof CompositeSpecTable.prototype.getColumnValuesFilter>
	filters: FilterRequest[]
}

const fetchExtendedDataObjInfo: (dobjs: string[]) => PortalThunkAction<void> = dobjs => dispatch => {
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

export const filtersReset = (dispatch: Function) => {
	dispatch(new MiscResetFilters());
	dispatch(getFilteredDataObjects(true));
};

export const toggleSort = (varName: string) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.SORTING_TOGGLED,
		varName
	});
	dispatch(getFilteredDataObjects(false));
};

export const requestStep = (direction: -1 | 1) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.STEP_REQUESTED,
		direction
	});
	dispatch(getFilteredDataObjects(false));
};

export const updateRoute = (route: string) => (dispatch: Function, getState: Function) => {
	const state = getState();
	const newRoute = route || getRouteFromLocationHash() || config.ROUTE_SEARCH;

	dispatch({
		type: actionTypes.ROUTE_UPDATED,
		route: newRoute
	});

	if (newRoute === config.ROUTE_CART && state.route !== newRoute){
		dispatch(getFilteredDataObjects(true));

	} else if (newRoute === config.ROUTE_SEARCH && state.route === config.ROUTE_CART){
		dispatch(getFilteredDataObjects(true));
	}
};

export const switchTab = (tabName: string, selectedTabId: string) => (dispatch: Function, getState: Function) => {

	dispatch({
		type: actionTypes.SWITCH_TAB,
		tabName,
		selectedTabId
	});

	const {tabs, filterFreeText, paging} = getState();

	if (tabName === 'searchTab'){
		if (isPidFreeTextSearch(tabs, filterFreeText)){
			dispatch(getFilteredDataObjects(false));
		} else {
			dispatch(getFilteredDataObjects(true));
		}
	}
};

export const setMetadataItem: (id: UrlStr) => PortalThunkAction<void> = id => (dispatch: Function) => {
	dispatch(new BackendObjectMetadataId(id));

	getMetadata(id).then(metadata => {
		const metadataWithId = Object.assign({}, metadata, {id});
		dispatch(new BackendObjectMetadata(metadataWithId));
	});
};

export const setPreviewItem = (id: UrlStr[]) => (dispatch: Function, getState: Function) => {
	dispatch(getTsPreviewSettings()).then(() => {
		dispatch({
			type: actionTypes.PREVIEW,
			id
		});

		if (!(getState() as State).preview.items.length) {
			dispatch(fetchExtendedDataObjInfo(id));
		}
	});
};

const getTsPreviewSettings = () => (dispatch: Function, getState: Function) => {
	const user = (getState() as State).user;

	return getTsSettings(user.email).then(tsSettings => {
		dispatch({
			type: actionTypes.TS_SETTINGS,
			tsSettings
		});
	});
};

export const storeTsPreviewSetting = (spec: string, type: string, val: string) => (dispatch: Function, getState: Function) => {
	const user = (getState() as State).user;

	saveTsSetting(user.email, spec, type, val).then(tsSettings => {
		dispatch({
			type: actionTypes.TS_SETTINGS,
			tsSettings
		});
	});
};

export const setPreviewUrl = (url: UrlStr) => (dispatch: Function) => {
	dispatch({
		type: actionTypes.ITEM_URL_UPDATED,
		url
	});
};

export const setCartName = (newName: string) => (dispatch: Function, getState: Function) => {
	const state: State = getState();

	dispatch(updateCart(state.user.email, state.cart.withName(newName)));
};

export const addToCart: (ids: UrlStr[]) => PortalThunkAction<void> = ids => (dispatch, getState) => {
	const state: State = getState();
	const cart = state.cart;

	const newItems = ids.filter(id => !state.cart.hasItem(id)).map(id => {
		const objInfo: any = state.objectsTable.find((o: any) => o.dobj === id);
		const specLookup = state.lookup && objInfo && objInfo.spec
			? state.lookup.getSpecLookup(objInfo.spec)
			: undefined;
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

export const removeFromCart: (ids: UrlStr[]) => PortalThunkAction<void> = ids => (dispatch, getState) => {
	const state: State = getState();
	const cart = state.cart.removeItems(ids);

	dispatch(updateCart(state.user.email, cart));
};

function updateCart(email: string | undefined, cart: Cart): PortalThunkAction<Promise<any>> {
	return dispatch => saveCart(email, cart).then(() =>
		dispatch({
			type: actionTypes.CART_UPDATED,
			cart
		})
	);
}

export const fetchIsBatchDownloadOk: PortalThunkAction<void> = dispatch => {
	Promise.all([getIsBatchDownloadOk(), getWhoIam()])
		.then(
			([isBatchDownloadOk, user]) => dispatch({
				type: actionTypes.TESTED_BATCH_DOWNLOAD,
				isBatchDownloadOk,
				user
			}),
			failWithError(dispatch)
		);
};

export const setFilterTemporal: (filterTemporal: FilterTemporal) => PortalThunkAction<void> = filterTemporal => (dispatch, getState) => {
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

	const filters = getFilters(getState());

	fetchDobjOriginsAndCounts(filters).then(dobjOriginsAndCounts => {
		dispatch(new BackendOriginsTable(dobjOriginsAndCounts));
		dispatch(getFilteredDataObjects(false));
	}, failWithError(dispatch));

};

export const getResourceHelpInfo: (helpItem: Item) => PortalThunkAction<void> = helpItem => (dispatch, getState) => {
	if (helpItem.shouldFetchList) {
		const {specTable} = getState() as any;
		const uriList = specTable
			.getAllDistinctAvailableColValues(helpItem.name)
			.filter((uri: string) => uri);

		if (uriList.length) {
			fetchResourceHelpInfo(uriList).then(resourceInfo => {
				dispatch(updateHelpInfo(helpItem.withList(resourceInfo)));
			}, failWithError(dispatch));
		} else {
			dispatch(updateHelpInfo(helpItem));
		}
	} else {
		dispatch(updateHelpInfo(helpItem));
	}
};

const updateHelpInfo: (helpItem: any) => PortalThunkAction<void> = helpItem => dispatch => {
	dispatch({
		type: actionTypes.HELP_INFO_UPDATED,
		helpItem
	});
};

export type SearchOption = {
	name: keyof SearchOptions
	value: boolean
}
export const updateSearchOption: (searchOption: SearchOption) => PortalThunkAction<void> = searchOption => (dispatch, getState) => {
	const {searchOptions, tabs, filterFreeText} = getState();

	dispatch(new MiscUpdateSearchOption(searchOptions, searchOption));

	if (!isPidFreeTextSearch(tabs, filterFreeText)){
		dispatch(getFilteredDataObjects(true));
	}
};
