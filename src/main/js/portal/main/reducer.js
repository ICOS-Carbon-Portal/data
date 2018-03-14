import {ERROR, SPECTABLES_FETCHED, FREE_TEXT_FILTER, SPEC_FILTER_UPDATED, OBJECTS_FETCHED, SORTING_TOGGLED, STEP_REQUESTED} from './actions';
import {SPEC_FILTER_RESET, ROUTE_UPDATED, RESTORE_FILTERS, CART_UPDATED, PREVIEW, PREVIEW_SETTING_UPDATED, PREVIEW_VISIBILITY} from './actions';
import {TESTED_BATCH_DOWNLOAD, ITEM_URL_UPDATED, USER_INFO_FETCHED, SWITCH_TAB, UPDATE_SELECTED_PIDS, EXTENDED_DOBJ_INFO_FETCHED} from './actions';
import {TEMPORAL_FILTER} from './actions';
import * as Toaster from 'icos-cp-toaster';
import CompositeSpecTable from './models/CompositeSpecTable';
import Lookup from './models/Lookup';
import Cart from './models/Cart';
import Preview from './models/Preview';
import FilterTemporal from './models/FilterTemporal';
import FilterFreeText from './models/FilterFreeText';
import RouteAndParams, {restoreRouteAndParams} from './models/RouteAndParams';
import {getRouteFromLocationHash} from './utils';
import config, {placeholders} from './config';

const initState = {
	routeAndParams: new RouteAndParams(),
	filterTemporal: new FilterTemporal(),
	filterFreeText: new FilterFreeText(),
	user: {},
	lookup: undefined,
	specTable: new CompositeSpecTable({}),
	extendedDobjInfo: [],
	formatToRdfGraph: {},
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

const specTableKeys = Object.keys(placeholders);

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case USER_INFO_FETCHED:
			return update({
				user: {
					profile: action.profile,
					email: action.user.email,
					ip: action.user.ip
				}
			});

		case SPECTABLES_FETCHED:
			let specTable = new CompositeSpecTable(action.specTables);
			let objCount = getObjCount(specTable);

			return update({
				specTable,
				formatToRdfGraph: action.formatToRdfGraph,
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount),
				lookup: new Lookup(specTable)
			});

		case SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);

			return update({
				routeAndParams: updateAndApplyRouteAndParams(state.routeAndParams, action.varName, action.values),
				specTable,
				objectsTable: [],
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case EXTENDED_DOBJ_INFO_FETCHED:
			return update({
				extendedDobjInfo: action.extendedDobjInfo
			});

		case SPEC_FILTER_RESET:
			specTable = state.specTable.withResetFilters();
			objCount = getObjCount(specTable);

			return update({
				routeAndParams: updateAndApplyRouteAndParams(state.routeAndParams),
				specTable,
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case RESTORE_FILTERS:
			let routeAndParams = restoreRouteAndParams(action.hash);
			specTable = Object.keys(routeAndParams.filters).reduce((specTable, filterKey) => {
				return specTableKeys.includes(filterKey)
					? specTable.withFilter(filterKey, routeAndParams.filters[filterKey])
					: specTable;
			}, state.specTable);
			objCount = getObjCount(specTable);

			const restoredFilterTemporal = state.filterTemporal.restore(routeAndParams.filters.filterTemporal);
			const restoredFilterFreeText = state.filterFreeText.restore(routeAndParams.filters.filterFreeText);

			return update({
				routeAndParams,
				specTable,
				objectsTable: [],
				paging: freshPaging(objCount, routeAndParams.pageOffset),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterTemporal: restoredFilterTemporal,
				filterFreeText: restoredFilterFreeText
			});

		case OBJECTS_FETCHED:
			const extendedObjectsTable = action.objectsTable.map(ot => {
				const spec = state.specTable.getTableRows('basics').find(r => r.spec === ot.spec);
				return Object.assign(ot, spec);
			});

			return update({
				objectsTable: extendedObjectsTable
			});

		case SORTING_TOGGLED:
			return update({
				objectsTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case STEP_REQUESTED:
			routeAndParams = state.routeAndParams.changePage(action.direction);
			updateUrl(routeAndParams.urlPart);

			return update({
				objectsTable: [],
				paging: updatePaging(state.paging, action.direction),
				routeAndParams
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

		case SWITCH_TAB:
			routeAndParams = state.routeAndParams.withTab({[action.tabName]: action.selectedTabId});
			updateUrl(routeAndParams.urlPart);

			return update({routeAndParams});

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

		case TEMPORAL_FILTER:
			return update({
				routeAndParams: updateAndApplyRouteAndParams(state.routeAndParams, 'filterTemporal', action.filterTemporal.summary),
				filterTemporal: action.filterTemporal
			});

		case FREE_TEXT_FILTER:
			let filterFreeText = updateFreeTextFilter(action.id, action.data, state.filterFreeText);

			return update({
				routeAndParams: updateAndApplyRouteAndParams(state.routeAndParams, 'filterFreeText', filterFreeText.summary),
				filterFreeText
			});

		case UPDATE_SELECTED_PIDS:
			filterFreeText = state.filterFreeText.withSelectedPids(action.selectedPids);

			return update({
				routeAndParams: updateAndApplyRouteAndParams(state.routeAndParams, 'filterFreeText', filterFreeText.summary),
				filterFreeText
			});

		default:
			return state;
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

function updateFreeTextFilter(id, data, filterFreeText){
	switch(id){
		case 'dobj':
			return filterFreeText.withPidList(data);

		default:
			return filterFreeText;
	}
}

function updateAndApplyRouteAndParams(currentRouteParams, varName, values){
	const routeAndParams = varName && values
		? currentRouteParams.withFilter(varName, values)
		: currentRouteParams.withResetFilters();
	updateUrl(routeAndParams.urlPart);
	return routeAndParams;
}

function updateUrl(urlPart){
	window.location.hash = urlPart;
}

function updateSorting(old, varName){
	const ascending = (old.varName === varName)
		? !old.ascending
		: true;
	return Object.assign({}, old, {varName, ascending});
}

function updateSortingEnableness(old, objCount){
	const isEnabled = objCount <= 2000;
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

function freshPaging(objCount, offset){
	return {
		objCount,
		offset: offset || 0,
		limit: config.STEPSIZE
	};
}

function updatePaging(old, direction){
	if(direction < 0){
		if(old.offset == 0) return old;
		const offset = Math.max(0, old.offset - config.STEPSIZE);
		return Object.assign({}, old, {offset});

	} else if(direction > 0){
		if(old.offset + old.limit >= old.objCount) return old;
		if(old.offset + config.STEPSIZE >= old.objCount) return old;
		const offset = old.offset + config.STEPSIZE;
		return Object.assign({}, old, {offset});

	} else return old;
}
