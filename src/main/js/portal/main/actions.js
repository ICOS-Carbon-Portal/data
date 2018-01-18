export const ERROR = 'ERROR';
export const SPECTABLES_FETCHED = 'SPECTABLES_FETCHED';
export const SPEC_FILTER_UPDATED = 'SPEC_FILTER_UPDATED';
export const SPEC_FILTER_RESET = 'SPEC_FILTER_RESET';
export const OBJECTS_FETCHED = 'OBJECTS_FETCHED';
export const SORTING_TOGGLED = 'SORTING_TOGGLED';
export const STEP_REQUESTED = 'STEP_REQUESTED';
export const META_QUERIED = 'META_QUERIED';
export const PREVIEW = 'PREVIEW';
export const PREVIEW_VISIBILITY = 'PREVIEW_VISIBILITY';
export const PREVIEW_SETTING_UPDATED = 'PREVIEW_SETTING_UPDATED';
export const ITEM_URL_UPDATED = 'ITEM_URL_UPDATED';
export const ROUTE_UPDATED = 'ROUTE_UPDATED';
export const SWITCH_TAB = 'SWITCH_TAB';
export const RESTORE_FILTERS = 'RESTORE_FILTERS';
export const CART_UPDATED = 'CART_UPDATED';
export const WHOAMI_FETCHED = 'WHOAMI_FETCHED';
export const USER_INFO_FETCHED = 'USER_INFO_FETCHED';
export const TESTED_BATCH_DOWNLOAD = 'TESTED_BATCH_DOWNLOAD';
export const TEMPORAL_FILTER = 'TEMPORAL_FILTER';
import {fetchAllSpecTables, searchDobjs, searchStations, fetchFilteredDataObjects, getCart, saveCart} from './backend';
import {getUserInfo, logOutUser} from './backend';
import {getIsBatchDownloadOk, getWhoIam, updatePortalUsage} from './backend';
import {restoreCarts} from './models/Cart';
import CartItem from './models/CartItem';
import {getNewTimeseriesUrl, getRouteFromLocationHash} from './utils.js';
import config from './config';


const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};

export const getAllSpecTables = hash => dispatch => {
	fetchAllSpecTables().then(
		specTables => {
			dispatch({
				type: SPECTABLES_FETCHED,
				specTables
			});

			dispatch(restoreFilters(hash));
			dispatch(getFilteredDataObjects);
		},
		failWithError(dispatch)
	);
};


export const queryMeta = (id, search, minLength) => dispatch => {
	if (search.length >= minLength) {

		switch (id) {
			case "dobj":
				searchDobjs(search).then(data => dispatchMeta(id, data, dispatch));
				break;

			case "station":
				searchStations(search).then(data => dispatchMeta(id, data, dispatch));
				break;

			default:
				dispatch(failWithError({message: `Could not find a method matching ${id} to query metadata`}));
		}
	} else {
		dispatchMeta(id, undefined, dispatch);
	}
};

const dispatchMeta = (id, data, dispatch) => {
	dispatch({
		type: META_QUERIED,
		metadata: {
			id,
			data
		}
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

export const getFilteredDataObjects = (dispatch, getState) => {
	const {specTable, routeAndParams, sorting, paging, user, filterTemporal} = getState();

	if (user.ip !== '127.0.0.1' && Object.keys(routeAndParams.filters).length) {
		updatePortalUsage({
			filterChange: {
				ip: user.ip,
				filters: routeAndParams.filters
			}
		});
	}

	const specs = specTable.getSpeciesFilter(null);
	const stations = specTable.getFilter('station').length
		? specTable.getDistinctAvailableColValues('stationUri')
		: [];

	fetchFilteredDataObjects({specs, stations, sorting, paging, filterTemporal}).then(
		({rows}) => dispatch({
			type: OBJECTS_FETCHED,
			objectsTable: rows
		}),
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

export const switchTab = selectedTab => dispatch => {
	dispatch({
		type: SWITCH_TAB,
		selectedTab
	});
};

const restoreFilters = hash => dispatch => {
	dispatch({
		type: RESTORE_FILTERS,
		hash
	});
};

export const setPreviewVisibility = visible => dispatch => {
	dispatch({
		type: PREVIEW_VISIBILITY,
		visible
	})
};

export const setPreviewItem = id => dispatch => {
	dispatch({
		type: PREVIEW,
		id
	})
};

export const setPreviewUrl = url => (dispatch, getState) => {
	const state = getState();
	const id = state.preview.item.id;

	if (state.cart.hasItem(id)) {
		const cart = state.cart.withItemUrl(id, url);

		saveCart(state.user.email, cart).then(
			dispatch({
				type: ITEM_URL_UPDATED,
				cart,
				url
			})
		);
	} else {
		dispatch({
			type: ITEM_URL_UPDATED,
			cart: state.cart,
			url
		})
	}
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

export const addToCart = objInfo => (dispatch, getState) => {
	const state = getState();
	const specLookup = state.lookup.getSpecLookup(objInfo.spec);
	const type = specLookup ? specLookup.type : undefined;
	const xAxis = specLookup && specLookup.type === config.TIMESERIES
		? specLookup.options.find(ao => ao === 'TIMESTAMP')
		: undefined;
	const item = new CartItem(objInfo, type);

	const cart = xAxis
		? state.cart.addItem(item.withUrl(getNewTimeseriesUrl(item, xAxis)))
		: state.cart.addItem(item);

	updateCart(state.user.email, cart, dispatch);
};

export const removeFromCart = id => (dispatch, getState) => {
	const state = getState();
	const cart = state.cart.removeItem(id);

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

export const fetchUserInfo = restoreCart => (dispatch, getState) => {
	getUserInfo().then(
		({profilePromise, user}) => {
			profilePromise.then(profile => {
				dispatch({
					type: USER_INFO_FETCHED,
					user,
					profile
				});

				if (restoreCart) fetchCart(dispatch, getState);
			});
		}
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

export const logOut = dispatch => {
	logOutUser().then(
		user => dispatch({
			type: USER_INFO_FETCHED,
			user
		})
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

	// dispatch(getFilteredDataObjects);
};
