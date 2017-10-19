import {ERROR, SPECTABLES_FETCHED, META_QUERIED, SPEC_FILTER_UPDATED, OBJECTS_FETCHED, SORTING_TOGGLED, STEP_REQUESTED} from './actions';
import {SPEC_FILTER_RESET, ROUTE_UPDATED, RESTORE_FILTERS, CART_UPDATED, PREVIEW, PREVIEW_SETTING_UPDATED, PREVIEW_VISIBILITY} from './actions';
import {TESTED_BATCH_DOWNLOAD, ITEM_URL_UPDATED, USER_INFO_FETCHED} from './actions';
import * as Toaster from 'icos-cp-toaster';
import CompositeSpecTable from './models/CompositeSpecTable';
import Lookup from './models/Lookup';
import Cart from './models/Cart';
import Preview from './models/Preview';
import RouteAndParams, {restoreRouteAndParams} from './models/RouteAndParams';
import {getRouteFromLocationHash} from './utils';

const initState = {
	routeAndParams: new RouteAndParams(),
	user: {},
	lookup: undefined,
	specTable: new CompositeSpecTable({}),
	objectsTable: [],
	sorting: {objCount: 0},
	paging: {},
	cart: new Cart(),
	preview: new Preview(),
	toasterData: undefined,
	batchDownloadStatus: {
		isAllowed: false,
		ts: 0
	}
};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case USER_INFO_FETCHED:
			return update({
				user: Object.assign({}, {email: action.user._id, ip: action.ip}, action.user.profile)
			});

		case SPECTABLES_FETCHED:
			let specTable = new CompositeSpecTable(action.specTables);
			let objCount = getObjCount(specTable);
			return update({
				specTable,
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount),
				lookup: new Lookup(specTable)
			});

		case META_QUERIED:
			return update({
				metadata: action.metadata
			});

		case SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			let routeAndParams = state.routeAndParams.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);
			window.location.hash = routeAndParams.urlPart;

			return update({
				routeAndParams,
				specTable,
				objectsTable: [],
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case SPEC_FILTER_RESET:
			specTable = state.specTable.withResetFilters();
			objCount = getObjCount(specTable);
			routeAndParams = state.routeAndParams.withResetFilters();
			window.location.hash = routeAndParams.urlPart;

			return update({
				routeAndParams,
				specTable,
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case RESTORE_FILTERS:
			routeAndParams = restoreRouteAndParams(action.hash);
			specTable = Object.keys(routeAndParams.filters).reduce((specTable, filterKey) => {
				return specTable.withFilter(filterKey, routeAndParams.filters[filterKey]);
			}, state.specTable);
			objCount = getObjCount(specTable);

			return update({
				routeAndParams,
				specTable,
				objectsTable: [],
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case OBJECTS_FETCHED:
			return update({
				objectsTable: action.objectsTable
			});

		case SORTING_TOGGLED:
			return update({
				objectsTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case STEP_REQUESTED:
			return update({
				objectsTable: [],
				paging: updatePaging(state.paging, action.direction)
			});

		case ROUTE_UPDATED:
			routeAndParams = state.routeAndParams.withRoute(action.route);
			const currentRoute = getRouteFromLocationHash();

			if (currentRoute !== action.route) {
				window.location.hash = routeAndParams.urlPart;
			}

			return update({
				routeAndParams
			});

		case PREVIEW:
			return update({
				preview: state.preview.initPreview(state.lookup.table, state.cart, action.id, state.objectsTable)
			});

		case PREVIEW_VISIBILITY:
			return update({preview: action.visible ? state.preview.show() : state.preview.hide()});

		case PREVIEW_SETTING_UPDATED:
			return update({
				cart: action.cart,
				preview: state.preview.withItemSetting(action.setting, action.value, state.preview.type)
			});

		case ITEM_URL_UPDATED:
			return update({
				cart: action.cart,
				preview: state.preview.withItemUrl(action.url)
			});

		case CART_UPDATED:
			return update({
				cart: action.cart
			});

		case TESTED_BATCH_DOWNLOAD:
			return update({
				user: action.user.email,
				batchDownloadStatus: {
					isAllowed: action.isBatchDownloadOk,
					ts: Date.now()
				}
			});

		default:
			return state;
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

function updateSorting(old, varName){
	const ascending = (old.varName === varName)
		? !old.ascending
		: false;
	return Object.assign({}, old, {varName, ascending});
}

function updateSortingEnableness(old, objCount){
	const isEnabled = objCount <= 1000;
	return isEnabled === old.isEnabled
		? old
		: Object.assign({}, old, {isEnabled});
}

function getObjCount(specTable){
	const originsTable = specTable.getTable('origins');
	return originsTable
		? originsTable.filteredRows.reduce((acc, next) => acc + (next.count || 0), 0)
		: 0;
}

const STEPSIZE = 20;

function freshPaging(objCount){
	return {
		objCount,
		offset: 0,
		limit: STEPSIZE
	};
}

function updatePaging(old, direction){
	if(direction < 0){
		if(old.offset == 0) return old;
		const offset = Math.max(0, old.offset - STEPSIZE);
		return Object.assign({}, old, {offset});

	} else if(direction > 0){
		if(old.offset + old.limit >= old.objCount) return old;
		if(old.offset + STEPSIZE >= old.objCount) return old;
		const offset = old.offset + STEPSIZE;
		return Object.assign({}, old, {offset});

	} else return old;
}
