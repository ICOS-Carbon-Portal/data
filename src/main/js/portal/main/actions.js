export const ERROR = 'ERROR';
export const INIT = 'INIT';
export const RESTORE_FROM_HASH = 'RESTORE_FROM_HASH';
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
import {fetchAllSpecTables, searchDobjs, getCart, saveCart} from './backend';
import {getIsBatchDownloadOk, getWhoIam, getProfile} from './backend';
import {areFiltersEnabled} from './reducer';
import {saveToRestheart} from '../../common/main/backend';
import {CachedDataObjectsExtendedFetcher, CachedDataObjectsFetcher} from "./CachedDataObjectsFetcher";
import {DataObjectsExtendedFetcher, DataObjectsFetcher} from "./CachedDataObjectsFetcher";
import {restoreCarts} from './models/Cart';
import CartItem from './models/CartItem';
import {getNewTimeseriesUrl, getRouteFromLocationHash} from './utils.js';
import config from './config';


const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

const dataObjectsExtendedFetcher = config.useDataObjectsCache
	? new CachedDataObjectsExtendedFetcher(config.dobjExtendedCacheFetchLimit, dataObjectsFetcher)
	: new DataObjectsExtendedFetcher();

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};

export const init = () => dispatch => {
	dispatch({type: INIT});
	dispatch(fetchUserInfo(true));
	dispatch(getAllSpecTables());
};

export const restoreFromHash = () => dispatch => {
	dispatch({type: RESTORE_FROM_HASH});
	dispatch(getFilteredDataObjects);
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

export const updateCheckedObjectsInCart = checkedObjectsInCart => dispatch => {
	dispatch({
		type: UPDATE_CHECKED_OBJECTS_IN_CART,
		checkedObjectsInCart
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

const logPortalUsage = (filterCategories, filterTemporal, filterFreeText) => {
	const filters = Object.assign({}, filterCategories, filterTemporal.summary, filterFreeText.summary);

	if (Object.keys(filters).length) {
		saveToRestheart({
			filterChange: {
				filters
			}
		});
	}
};

export const getFilteredDataObjects = (dispatch, getState) => {
	const {specTable, route, preview, sorting, paging, formatToRdfGraph,
		tabs, filterCategories, filterTemporal, filterFreeText} = getState();

	const filters = route === config.ROUTE_PREVIEW && preview.hasPids
		? [{category: 'pids', pids: preview.summary}]
		: areFiltersEnabled(tabs, filterTemporal, filterFreeText)
			? filterTemporal.filters.concat([{category: 'pids', pids: filterFreeText.selectedPids}])
			: [];

	logPortalUsage(filterCategories, filterTemporal, filterFreeText);

	const specs = specTable.getSpeciesFilter(null);
	const stations = specTable.getFilter('station').length
		? specTable.getDistinctAvailableColValues('stationUri')
		: [];

	const submitters = specTable.getFilter('submitter').length
		? specTable.getDistinctAvailableColValues('submitterUri')
		: [];

	const rdfGraphs = specTable.getColumnValuesFilter('format')
		.map(f => formatToRdfGraph[f]);

	const options = {specs, stations, submitters, sorting, paging, rdfGraphs, filters};

	dataObjectsFetcher.fetch(options).then(
		({rows, cacheSize, isDataEndReached}) => {

			const opts = config.useDataObjectsCache ? options : rows.map(d => `<${d.dobj}>`);

			dispatch(fetchExtendedDataObjInfo(opts));

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

const fetchExtendedDataObjInfo = options => dispatch => {
	dataObjectsExtendedFetcher.fetch(options)
		.then(
			extendedDobjInfo => {
				dispatch({
					type: EXTENDED_DOBJ_INFO_FETCHED,
					extendedDobjInfo
				})
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
	dispatch(getFilteredDataObjects);
};

export const requestStep = direction => dispatch => {
	dispatch({
		type: STEP_REQUESTED,
		direction
	});
	dispatch(getFilteredDataObjects);
};

export const updateRoute = route => dispatch => {
	const newRoute = route || getRouteFromLocationHash() || config.ROUTE_SEARCH;

	dispatch({
		type: ROUTE_UPDATED,
		route: newRoute
	});
};

export const switchTab = (tabName, selectedTabId) => (dispatch, getState) => {
	const {filterTemporal, filterFreeText} = getState();

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
	dispatch({
		type: PREVIEW,
		id
	});
};

export const setPreviewUrl = url => dispatch => {
	dispatch({
		type: ITEM_URL_UPDATED,
		url
	});
};

export const fetchCart = (dispatch, getState) => {
	const state = getState();

	getCart(state.user.email).then(
		({cartInLocalStorage, cartInRestheart}) => {

			cartInRestheart.then(restheartCart => {
				const cart = restoreCarts(cartInLocalStorage, restheartCart);
				updateCart(state.user.email, cart, dispatch);
			});
		}
	);
};

export const setCartName = newName => (dispatch, getState) => {
	const state = getState();

	updateCart(state.user.email, state.cart.withName(newName), dispatch);
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
		updateCart(state.user.email, cart.addItem(newItems), dispatch);
	}
};

export const removeFromCart = ids => (dispatch, getState) => {
	const state = getState();
	const cart = state.cart.removeItems(ids);

	updateCart(state.user.email, cart, dispatch);
};

const updateCart = (email, cart, dispatch) => {
	saveCart(email, cart).then(
		dispatch({
			type: CART_UPDATED,
			cart
		})
	);
};

export const fetchUserInfo = restoreCart => dispatch => {
	getWhoIam()
		.then(user => {
			dispatch({
				type: WHOAMI_FETCHED,
				user
			});
			return user;
		})
		.then(user => {
			getProfile(user.email).then(profile => {
				dispatch({
					type: USER_INFO_FETCHED,
					user,
					profile
				});

				if (restoreCart) dispatch(fetchCart);
			});
		});
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

const updatePaging = (old, direction) => {
	if(direction < 0){
		if(old.offset === 0) return old;
		const offset = Math.max(0, old.offset - config.stepsize);
		return Object.assign({}, old, {offset});

	} else if(direction > 0){
		if(old.offset + old.limit >= old.objCount) return old;
		if(old.offset + config.stepsize >= old.objCount) return old;
		const offset = old.offset + config.stepsize;
		return Object.assign({}, old, {offset});

	} else return old;
};
