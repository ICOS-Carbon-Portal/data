import Cart from "./models/Cart";

export const ERROR = 'ERROR';
export const INIT = 'INIT';
export const LOAD_ERROR = 'LOAD_ERROR';
export const RESTORE_FROM_HISTORY = 'RESTORE_FROM_HISTORY';
export const SPECTABLES_FETCHED = 'SPECTABLES_FETCHED';
export const SPEC_FILTER_UPDATED = 'SPEC_FILTER_UPDATED';
export const SPEC_FILTER_RESET = 'SPEC_FILTER_RESET';
export const OBJECTS_FETCHED = 'OBJECTS_FETCHED';
export const SORTING_TOGGLED = 'SORTING_TOGGLED';
export const STEP_REQUESTED = 'STEP_REQUESTED';
export const PREVIEW = 'PREVIEW';
export const PREVIEW_VISIBILITY = 'PREVIEW_VISIBILITY';
export const PREVIEW_SETTING_UPDATED = 'PREVIEW_SETTING_UPDATED';
export const ITEM_URL_UPDATED = 'ITEM_URL_UPDATED';
export const ROUTE_UPDATED = 'ROUTE_UPDATED';
export const SWITCH_TAB = 'SWITCH_TAB';
export const RESTORE_FILTERS = 'RESTORE_FILTERS';
export const RESTORE_PREVIEW = 'RESTORE_PREVIEW';
export const CART_UPDATED = 'CART_UPDATED';
export const WHOAMI_FETCHED = 'WHOAMI_FETCHED';
export const EXTENDED_DOBJ_INFO_FETCHED = 'EXTENDED_DOBJ_INFO_FETCHED';
export const USER_INFO_FETCHED = 'USER_INFO_FETCHED';
export const TESTED_BATCH_DOWNLOAD = 'TESTED_BATCH_DOWNLOAD';
export const TEMPORAL_FILTER = 'TEMPORAL_FILTER';
export const FREE_TEXT_FILTER = 'FREE_TEXT_FILTER';
export const UPDATE_SELECTED_PIDS = 'UPDATE_SELECTED_PIDS';
export const UPDATE_SELECTED_IDS = 'UPDATE_SELECTED_IDS';
export const UPDATE_CHECKED_OBJECTS_IN_SEARCH = 'UPDATE_CHECKED_OBJECTS_IN_SEARCH';
export const UPDATE_CHECKED_OBJECTS_IN_CART = 'UPDATE_CHECKED_OBJECTS_IN_CART';
export const TS_SETTINGS = 'TS_SETTINGS';
export const HELP_INFO_UPDATED = 'HELP_INFO_UPDATED';
import {hashToState} from "./models/State";
import {fetchAllSpecTables, searchDobjs, getCart, saveCart, logOut, fetchResourceHelpInfo} from './backend';
import {getIsBatchDownloadOk, getWhoIam, getProfile, getError, getTsSettings, saveTsSetting} from './backend';
import {getExtendedDataObjInfo} from './backend';
import {areFiltersEnabled} from './reducer';
import {DataObjectsFetcher, CachedDataObjectsFetcher} from "./CachedDataObjectsFetcher";
import {restoreCarts} from './models/Cart';
import CartItem from './models/CartItem';
import {getNewTimeseriesUrl, getRouteFromLocationHash} from './utils.js';
import config from './config';
import {saveToRestheart} from "../../common/main/backend";


const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});

	dispatch(logError(error));
};

const logError = error => (dispatch, getState) => {
	const state = getState();
	const user = state.user.email
		? `${state.user.profile.profile.givenName} ${state.user.profile.profile.surname}`
		: undefined;

	saveToRestheart({
		error: {
			app: 'portal',
			message: error.message,
			state: JSON.stringify(Object.assign({}, state.serialize, {user, cart: state.cart})),
			url: decodeURI(window.location)
		}
	});
};

export const init = () => dispatch => {
	const stateFromHash = hashToState();

	getWhoIam().then(user => {
		if (stateFromHash.error){
			if (user.email) logOut();
			dispatch(loadFromError(user, stateFromHash.error));

		} else {
			dispatch(loadApp(user));
		}
	});
};

const loadApp = user => dispatch => {
	dispatch({type: INIT});

	getProfile(user.email).then(profile => {
		dispatch({
			type: USER_INFO_FETCHED,
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
					.then(_ => dispatch(getAllSpecTables()));
			});
		}
	);
};

const loadFromError = (user, errorId) => dispatch => {
	getError(errorId).then(response => {
		if (response && response.error && response.error.state) {
			const stateJSON = JSON.parse(response.error.state);
			const objectsTable = stateJSON.objectsTable.map(ot => {
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
				type: LOAD_ERROR,
				state,
				cart
			});
		} else {
			dispatch(loadApp(user));
		}
	});
};

export const restoreFromHistory = historyState => dispatch => {
	if (Date.now() - historyState.ts < config.historyStateMaxAge) {
		dispatch({
			type: RESTORE_FROM_HISTORY,
			historyState
		});
	} else {
		dispatch(init());
	}
};

export const getAllSpecTables = () => dispatch => {
	fetchAllSpecTables().then(
		allTables => {
			dispatch(Object.assign({type: SPECTABLES_FETCHED}, allTables));
			dispatch({type: RESTORE_FILTERS});
			dispatch(getFilteredDataObjects);
		},
		failWithError(dispatch)
	);
};


export const queryMeta = (id, search) => dispatch => {
	switch (id) {
		case "dobj":
			searchDobjs(search).then(data => dispatchMeta(id, data, dispatch));
			break;

		default:
			dispatch(failWithError({message: `Could not find a method matching ${id} to query metadata`}));
	}
};

const dispatchMeta = (id, data, dispatch) => {
	dispatch({
		type: FREE_TEXT_FILTER,
		id,
		data
	});

	if (id === 'dobj' && (data.length === 0 || data.length === 1)){
		dispatch(getFilteredDataObjects);
	}
};

export const updateSelectedPids = selectedPids => dispatch => {
	dispatch({
		type: UPDATE_SELECTED_PIDS,
		selectedPids
	});

	dispatch(getFilteredDataObjects);
};

export const updateCheckedObjectsInSearch = checkedObjectInSearch => dispatch => {
	dispatch({
		type: UPDATE_CHECKED_OBJECTS_IN_SEARCH,
		checkedObjectInSearch
	});
};

export const updateCheckedObjectsInCart = checkedObjectInCart => dispatch => {
	dispatch({
		type: UPDATE_CHECKED_OBJECTS_IN_CART,
		checkedObjectInCart
	});
};

export const specFilterUpdate = (varName, values) => dispatch => {
	dispatch({
		type: SPEC_FILTER_UPDATED,
		varName,
		values
	});
	dispatch(getFilteredDataObjects);
};

const logPortalUsage = (specTable, filterCategories, filterTemporal, filterFreeText) => {
	if (Object.keys(filterCategories).length || filterTemporal.hasFilter || filterFreeText.hasFilter) {

		const filters = Object.keys(filterCategories).reduce((acc, columnName) => {
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

export const getFilteredDataObjects = (dispatch, getState) => {
	dispatch(getFilteredDataObjectsWithoutUsageLogging);

	const {route, specTable, filterCategories, filterTemporal, filterFreeText} = getState();

	if (route === undefined || route === config.ROUTE_SEARCH) {
		logPortalUsage(specTable, filterCategories, filterTemporal, filterFreeText);
	}

}

const getFilteredDataObjectsWithoutUsageLogging = (dispatch, getState) => {
	const {specTable, route, preview, sorting, formatToRdfGraph,
		tabs, filterTemporal, filterFreeText, cart} = getState();

	const getFilters = () => {
		if (route === config.ROUTE_PREVIEW && preview.hasPids){
			return [{category: 'pids', pids: preview.pids}];

		} else if (route === config.ROUTE_CART) {
			return [{
				category: 'pids',
				pids: cart.ids.map(id => id.split('/').pop())
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
		: specTable.getColumnValuesFilter('format').map(f => formatToRdfGraph[f]);

	const paging = route === config.ROUTE_CART
		? {offset: 0, limit: cart.ids.length}
		: getState().paging;

	const options = {specs, stations, submitters, sorting, paging, rdfGraphs, filters};

	dataObjectsFetcher.fetch(options).then(
		({rows, cacheSize, isDataEndReached}) => {

			dispatch(fetchExtendedDataObjInfo(rows.map(d => d.dobj)));

			dispatch({
				type: OBJECTS_FETCHED,
				objectsTable: rows,
				cacheSize,
				isDataEndReached
			});
			if (route === config.ROUTE_PREVIEW) dispatch({type: RESTORE_PREVIEW});
		},
		failWithError(dispatch)
	);
};

const fetchExtendedDataObjInfo = dobjs => dispatch => {
	getExtendedDataObjInfo(dobjs).then(
		extendedDobjInfo => {
			dispatch({
				type: EXTENDED_DOBJ_INFO_FETCHED,
				extendedDobjInfo
			});
		},
		failWithError(dispatch)
	);
};

export const specFiltersReset = dispatch => {
	dispatch({type: SPEC_FILTER_RESET});
	dispatch(getFilteredDataObjects);
};

export const toggleSort = varName => dispatch => {
	dispatch({
		type: SORTING_TOGGLED,
		varName
	});
	dispatch(getFilteredDataObjectsWithoutUsageLogging);
};

export const requestStep = direction => dispatch => {
	dispatch({
		type: STEP_REQUESTED,
		direction
	});
	dispatch(getFilteredDataObjectsWithoutUsageLogging);
};

export const updateRoute = route => (dispatch, getState) => {
	const state = getState();
	const newRoute = route || getRouteFromLocationHash() || config.ROUTE_SEARCH;

	dispatch({
		type: ROUTE_UPDATED,
		route: newRoute
	});

	if (newRoute === config.ROUTE_CART && state.route !== newRoute){
		dispatch(getFilteredDataObjects);

	} else if (newRoute === config.ROUTE_SEARCH && state.route === config.ROUTE_CART){
		dispatch(getFilteredDataObjects);
	}
};

export const switchTab = (tabName, selectedTabId) => dispatch => {

	dispatch({
		type: SWITCH_TAB,
		tabName,
		selectedTabId
	});

	if (tabName === 'searchTab'){
		dispatch(getFilteredDataObjects);
	}
};

export const setPreviewItem = id => dispatch => {
	dispatch(getTsPreviewSettings()).then(_ => {
		dispatch({
			type: PREVIEW,
			id
		});
	});
};

const getTsPreviewSettings = _ => (dispatch, getState) => {
	const user = getState().user;

	return getTsSettings(user.email).then(tsSettings => {
		dispatch({
			type: TS_SETTINGS,
			tsSettings
		});
	});
};

export const storeTsPreviewSetting = (spec, type, val) => (dispatch, getState) => {
	const user = getState().user;

	saveTsSetting(user.email, spec, type, val).then(tsSettings => {
		dispatch({
			type: TS_SETTINGS,
			tsSettings
		});
	});
};

export const setPreviewUrl = url => dispatch => {
	dispatch({
		type: ITEM_URL_UPDATED,
		url
	});
};

export const setCartName = newName => (dispatch, getState) => {
	const state = getState();

	dispatch(updateCart(state.user.email, state.cart.withName(newName)));
};

export const addToCart = ids => (dispatch, getState) => {
	const state = getState();
	const cart = state.cart;

	const newItems = ids.filter(id => state.cart.hasItem(id) === false).map(id => {
		const objInfo = state.objectsTable.find(o => o.dobj === id);
		const specLookup = state.lookup.getSpecLookup(objInfo.spec);
		const type = specLookup ? specLookup.type : undefined;
		const xAxis = specLookup && specLookup.type === config.TIMESERIES
			? specLookup.options.find(ao => ao === 'TIMESTAMP')
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

export const removeFromCart = ids => (dispatch, getState) => {
	const state = getState();
	const cart = state.cart.removeItems(ids);

	dispatch(updateCart(state.user.email, cart));
};

const updateCart = (email, cart) => dispatch => {
	return saveCart(email, cart).then(
		dispatch({
			type: CART_UPDATED,
			cart
		})
	);
};

export const fetchIsBatchDownloadOk = dispatch => {
	Promise.all([getIsBatchDownloadOk(), getWhoIam()])
		.then(
			([isBatchDownloadOk, user]) => dispatch({
				type: TESTED_BATCH_DOWNLOAD,
				isBatchDownloadOk,
				user
			}),
			err => dispatch(failWithError(err))
		);
};

export const setFilterTemporal = filterTemporal => dispatch => {
	if (filterTemporal.dataTime.error) {
		failWithError(dispatch)(new Error(filterTemporal.dataTime.error));
	}
	if (filterTemporal.submission.error) {
		failWithError(dispatch)(new Error(filterTemporal.submission.error));
	}

	dispatch({
		type: TEMPORAL_FILTER,
		filterTemporal
	});

	if (filterTemporal.dataTime.error || filterTemporal.submission.error) return;

	dispatch(getFilteredDataObjects);
};

export const getResourceHelpInfo = (helpItem, uriList) => dispatch => {
	if (helpItem.shouldFetchList) {
		fetchResourceHelpInfo(uriList).then(resourceInfo => {
			dispatch({
				type: HELP_INFO_UPDATED,
				helpItem: helpItem.withList(resourceInfo)
			});
		});
	} else {
		dispatch({
			type: HELP_INFO_UPDATED,
			helpItem
		});
	}
};
