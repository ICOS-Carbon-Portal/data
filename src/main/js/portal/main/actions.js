export const ERROR = 'ERROR';
export const SPECTABLES_FETCHED = 'SPECTABLES_FETCHED';
export const SPEC_FILTER_UPDATED = 'SPEC_FILTER_UPDATED';
export const OBJECTS_FETCHED = 'OBJECTS_FETCHED';
export const SORTING_TOGGLED = 'SORTING_TOGGLED';
export const STEP_REQUESTED = 'STEP_REQUESTED';
export const META_QUERIED = 'META_QUERIED';
export const PREVIEW = 'PREVIEW';
export const PREVIEW_VISIBILITY = 'PREVIEW_VISIBILITY';
export const PREVIEW_SETTING_UPDATED = 'PREVIEW_SETTING_UPDATED';
export const ROUTE_CHANGED = 'ROUTE_CHANGED';
export const CART_UPDATED = 'CART_UPDATED';
export const COL_INFO_FETCHED = 'COL_INFO_FETCHED';
import {fetchAllSpecTables, searchDobjs, searchStations, fetchFilteredDataObjects, getCart, saveCart, getObjColInfo} from './backend';
import CartItem from './models/CartItem';


const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
}

export const getAllSpecTables = dispatch => {
	fetchAllSpecTables().then(
		specTables => {
			dispatch({
				type: SPECTABLES_FETCHED,
				specTables
			});
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
	const {specTable, sorting, paging} = getState();

	const specs = specTable.getSpeciesFilter(null);

	const stations = specTable.getFilter('station').length
		? specTable.getDistinctAvailableColValues('stationUri')
		: [];

	fetchFilteredDataObjects({specs, stations, sorting, paging}).then(
		({rows}) => dispatch({
			type: OBJECTS_FETCHED,
			objectsTable: rows
		}),
		failWithError(dispatch)
	);
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

export const changeRoute = route => dispatch => {
	dispatch({
		type: ROUTE_CHANGED,
		route
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

export const setPreviewItemSetting = (id, setting, value) => (dispatch, getState) => {
	const state = getState();

	if (state.cart.hasItem(id)) {
		const cart = state.cart.withItemSetting(id, setting, value);

		saveCart(cart).then(
			dispatch({
				type: PREVIEW_SETTING_UPDATED,
				cart,
				setting,
				value
			})
		);
	} else {
		dispatch({
			type: PREVIEW_SETTING_UPDATED,
			cart: state.cart,
			setting,
			value
		})
	}
};

export const fetchCart = dispatch => {
	getCart().then(
		cart => dispatch({
			type: CART_UPDATED,
			cart
		})
	);
};

export const addToCart = objInfo => (dispatch, getState) => {
	const state = getState();
	const specLookup = state.previewLookup[objInfo.spec];
	const xAxisSetting = specLookup.type === 'TIMESERIES'
		? specLookup.options.find(ao => ao === 'TIMESTAMP')
		: undefined;

	const cart = xAxisSetting
		? state.cart.addItem(new CartItem(objInfo).withSetting('xAxis', xAxisSetting))
		: state.cart.addItem(new CartItem(objInfo));

	updateCart(cart, dispatch);
};

export const removeFromCart = id => (dispatch, getState) => {
	const state = getState();
	const cart = state.cart.removeItem(id);

	updateCart(cart, dispatch);
};

const updateCart = (cart, dispatch) => {
	saveCart(cart).then(
		dispatch({
			type: CART_UPDATED,
			cart
		})
	);
};
