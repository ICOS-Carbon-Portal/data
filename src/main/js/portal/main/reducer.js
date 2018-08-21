import {ERROR, SPECTABLES_FETCHED, FREE_TEXT_FILTER, SPEC_FILTER_UPDATED, OBJECTS_FETCHED, SORTING_TOGGLED, STEP_REQUESTED,
	SPEC_FILTER_RESET, ROUTE_UPDATED, RESTORE_FILTERS, RESTORE_PREVIEW, CART_UPDATED, PREVIEW, PREVIEW_SETTING_UPDATED,
	PREVIEW_VISIBILITY, TESTED_BATCH_DOWNLOAD, ITEM_URL_UPDATED, USER_INFO_FETCHED, SWITCH_TAB, UPDATE_SELECTED_PIDS,
	EXTENDED_DOBJ_INFO_FETCHED, UPDATE_CHECKED_OBJECTS_IN_SEARCH, UPDATE_CHECKED_OBJECTS_IN_CART, INIT} from './actions';
import {TEMPORAL_FILTER, WHOAMI_FETCHED, RESTORE_FROM_HASH} from './actions';
import * as Toaster from 'icos-cp-toaster';
import CompositeSpecTable from './models/CompositeSpecTable';
import Lookup from './models/Lookup';
import Cart from './models/Cart';
import Preview from './models/Preview';
import FilterTemporal from './models/FilterTemporal';
import FilterFreeText from './models/FilterFreeText';
import config, {placeholders} from './config';
import Paging from './models/Paging';
import {hash2State} from "./models/HashStateHandler";

const initState = {
	filterCategories: {},
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
	},
	checkedObjectsInSearch: [],
	checkedObjectsInCart: []
};

const specTableKeys = Object.keys(placeholders);

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case INIT:
			const initState = hash2State();
			return update(initState);

		case WHOAMI_FETCHED:
			return update({user: action.user});

		case USER_INFO_FETCHED:
			return update({
				user: {
					profile: action.profile,
					email: action.user.email
				}
			});

		case SPECTABLES_FETCHED:
			specTable = new CompositeSpecTable(action.specTables);
			let objCount = getObjCount(specTable);

			return update({
				specTable,
				formatToRdfGraph: action.formatToRdfGraph,
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				lookup: new Lookup(specTable)
			});

		case RESTORE_FILTERS:
			let {filterCategories, page} = state;
			let specTable = getSpecTable(state.specTable, filterCategories);
			objCount = getObjCount(specTable);
			let paging = new Paging({objCount, offset: page * config.stepsize});

			return update({
				specTable,
				objectsTable: [],
				paging,
				sorting: updateSortingEnableness(state.sorting, objCount),
				// filterTemporal: restoredFilterTemporal,
				// filterFreeText: restoredFilterFreeText
			});

		case RESTORE_FROM_HASH:
			const newHashState = hash2State();
			filterCategories = newHashState.filterCategories;

			specTable = getSpecTable(state.specTable.withResetFilters(), filterCategories);
			objCount = getObjCount(specTable);
			const filtersEnabled = areFiltersEnabled(newHashState.tabs, newHashState.filterTemporal, newHashState.filterFreeText);
			paging = new Paging({objCount, offset: newHashState.page * config.stepsize}).withFiltersEnabled(filtersEnabled);

			// console.log({newHashState, state, preview: state.preview, specTable, objCount, paging, offset: newHashState.page * config.stepsize, filtersEnabled});

			return update({
				route: newHashState.route,
				specTable,
				objectsTable: [],
				paging,
				// sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: newHashState.filterCategories,
				filterTemporal: newHashState.filterTemporal,
				filterFreeText: newHashState.filterFreeText,
				tabs: newHashState.tabs,
				page: newHashState.page,
				preview: newHashState.preview
			});

		case SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);

			return update({
				specTable,
				objectsTable: [],
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: Object.assign(state.filterCategories, {[action.varName]: action.values})
			});

		case SPEC_FILTER_RESET:
			specTable = state.specTable.withResetFilters();
			objCount = getObjCount(specTable);

			return update({
				specTable,
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: {}
			});

		case RESTORE_PREVIEW:
			// console.log({route: state.route, table: state.lookup ? state.lookup.table : undefined, cart: state.cart, hasPids: state.preview.hasPids, preview: state.preview, objectsTable: state.objectsTable});

			return update({
				preview: state.preview.restore(state.lookup.table, state.cart, state.objectsTable)
			});

		case OBJECTS_FETCHED:
			const extendedObjectsTable = action.objectsTable.map(ot => {
				const spec = state.specTable.getTableRows('basics').find(r => r.spec === ot.spec);
				return Object.assign(ot, spec);
			});
			// console.log({extendedObjectsTable, objectsTable: action.objectsTable});

			return update({
				objectsTable: extendedObjectsTable,
				paging: state.paging.withObjCount(
					getObjCount(state.specTable),
					action.objectsTable.length,
					areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText),
					action.cacheSize,
					action.isDataEndReached
				)
			});

		case EXTENDED_DOBJ_INFO_FETCHED:
			return update({
				extendedDobjInfo: action.extendedDobjInfo
			});

		case SORTING_TOGGLED:
			return update({
				objectsTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case STEP_REQUESTED:
			return update({
				objectsTable: [],
				paging: state.paging.withDirection(action.direction),
				page: state.page + action.direction
			});

		case ROUTE_UPDATED:
			return update({
				route: action.route
			});

		case SWITCH_TAB:
			paging = new Paging({objCount, offset: state.page * config.stepsize})
				.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText));

			return update({
				tabs: Object.assign({}, state.tabs, {[action.tabName]: action.selectedTabId}),
				paging
			});

		case PREVIEW:
			return update({
				route: config.ROUTE_PREVIEW,
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
// console.log({oldFilterTemporal: state.filterTemporal, newfilterTemporal: action.filterTemporal});
			return update({
				filterTemporal: action.filterTemporal,
				paging: state.paging.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText))
			});

		case FREE_TEXT_FILTER:
			let filterFreeText = updateFreeTextFilter(action.id, action.data, state.filterFreeText);

			return update({
				filterFreeText
			});

		case UPDATE_SELECTED_PIDS:
			filterFreeText = state.filterFreeText.withSelectedPids(action.selectedPids);

			return update({
				filterFreeText,
				paging: state.paging.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, filterFreeText))
			});

		case UPDATE_CHECKED_OBJECTS_IN_SEARCH:
			return update({
				checkedObjectsInSearch: action.checkedObjectsInSearch
			});

		case UPDATE_CHECKED_OBJECTS_IN_CART:
			return update({
				checkedObjectsInCart: action.checkedObjectsInCart
			});

		default:
			return state;
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

export const areFiltersEnabled = (tabs, filterTemporal, filterFreeText) => {
	return tabs.searchTab === 1
		&& ((filterTemporal !== undefined && filterTemporal.hasFilter)
			|| (filterFreeText !== undefined && filterFreeText.hasFilter));
};

function updateFreeTextFilter(id, data, filterFreeText){
	switch(id){
		case 'dobj':
			return filterFreeText.withPidList(data);

		default:
			return filterFreeText;
	}
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

function getSpecTable(startTable, filterCategories){
	return Object.keys(filterCategories).reduce((specTable, varName) => {
		return specTableKeys.includes(varName)
			? specTable.withFilter(varName, filterCategories[varName])
			: specTable;
	}, startTable);
}

function getObjCount(specTable){
	const originsTable = specTable.getTable('origins');
	return originsTable
		? originsTable.filteredRows.reduce((acc, next) => acc + (next.count || 0), 0)
		: 0;
}
