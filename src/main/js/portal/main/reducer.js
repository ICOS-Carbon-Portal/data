import {
	ERROR,
	SPECTABLES_FETCHED,
	FREE_TEXT_FILTER,
	SPEC_FILTER_UPDATED,
	OBJECTS_FETCHED,
	SORTING_TOGGLED,
	STEP_REQUESTED,
	SPEC_FILTER_RESET,
	ROUTE_UPDATED,
	RESTORE_FILTERS,
	RESTORE_PREVIEW,
	CART_UPDATED,
	PREVIEW,
	PREVIEW_SETTING_UPDATED,
	PREVIEW_VISIBILITY,
	TESTED_BATCH_DOWNLOAD,
	ITEM_URL_UPDATED,
	USER_INFO_FETCHED,
	SWITCH_TAB,
	UPDATE_SELECTED_PIDS,
	EXTENDED_DOBJ_INFO_FETCHED,
	UPDATE_CHECKED_OBJECTS_IN_SEARCH,
	UPDATE_CHECKED_OBJECTS_IN_CART,
	INIT,
	RESTORE_FROM_HISTORY,
	TEMPORAL_FILTER,
	WHOAMI_FETCHED,
	SAVE_STATE} from './actions';
import * as Toaster from 'icos-cp-toaster';
import State from './models/State';
import CompositeSpecTable from './models/CompositeSpecTable';
import Lookup from './models/Lookup';
import Preview from './models/Preview';
import config, {placeholders} from './config';
import Paging from './models/Paging';
import {getStateFromHash} from "./models/HashStateHandler";


const specTableKeys = Object.keys(placeholders);

export default function(state = new State(), action){
	console.log({actionType: action.type, state, history: history.state});
	switch(action.type){

		case ERROR:
			return state.update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case INIT:
			return state.update(getStateFromHash());

		case WHOAMI_FETCHED:
			return state.update({user: action.user});

		case USER_INFO_FETCHED:
			return state.update({
				user: {
					profile: action.profile,
					email: action.user.email
				}
			});

		case SPECTABLES_FETCHED:
			specTable = new CompositeSpecTable(action.specTables);
			let objCount = getObjCount(specTable);

			return state.update({
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

			return state.update({
				specTable,
				objectsTable: [],
				paging,
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case RESTORE_FROM_HISTORY:
			return State.deserialize(action.historyState, state.cart);

		case SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);

			return state.update({
				specTable,
				objectsTable: [],
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: Object.assign(state.filterCategories, {[action.varName]: action.values})
			});

		case SPEC_FILTER_RESET:
			specTable = state.specTable.withResetFilters();
			objCount = getObjCount(specTable);

			return state.update({
				specTable,
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: {}
			});

		case RESTORE_PREVIEW:
			return state.update({
				preview: state.preview.restore(state.lookup.table, state.cart, state.objectsTable)
			});

		case OBJECTS_FETCHED:
			const extendedObjectsTable = action.objectsTable.map(ot => {
				const spec = state.specTable.getTableRows('basics').find(r => r.spec === ot.spec);
				return Object.assign(ot, spec);
			});
			paging = state.paging.withObjCount(
				getObjCount(state.specTable),
				action.objectsTable.length,
				areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText),
				action.cacheSize,
				action.isDataEndReached
			);
			objCount = paging.isCountKnown ? paging.objCount : getObjCount(state.specTable);

			return state.update({
				objectsTable: extendedObjectsTable,
				paging,
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case EXTENDED_DOBJ_INFO_FETCHED:
			return state.updateAndSave({
				extendedDobjInfo: action.extendedDobjInfo
			});

		case SORTING_TOGGLED:
			return state.update({
				objectsTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case STEP_REQUESTED:
			return state.update({
				objectsTable: [],
				paging: state.paging.withDirection(action.direction),
				page: state.page + action.direction
			});

		case ROUTE_UPDATED:
			return state.update({
				route: action.route,
				preview: action.route === config.ROUTE_PREVIEW ? state.preview : new Preview()
			});

		case SWITCH_TAB:
			paging = state.paging
				.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText))
				.withOffset(0);

			return state.update({
				tabs: Object.assign({}, state.tabs, {[action.tabName]: action.selectedTabId}),
				paging,
				page: 0
			});

		case PREVIEW:
			return state.update({
				route: config.ROUTE_PREVIEW,
				preview: state.preview.initPreview(state.lookup.table, state.cart, action.id, state.objectsTable)
			});

		case PREVIEW_VISIBILITY:
			return state.update({preview: action.visible ? state.preview.show() : state.preview.hide()});

		case PREVIEW_SETTING_UPDATED:
			return state.update({
				cart: action.cart,
				preview: state.preview.withItemSetting(action.setting, action.value, state.preview.type)
			});

		case ITEM_URL_UPDATED:
			return state.update({
				preview: state.preview.withItemUrl(action.url)
			});

		case CART_UPDATED:
			return state.update({
				cart: action.cart
			});

		case TESTED_BATCH_DOWNLOAD:
			return state.update({
				user: action.user.email,
				batchDownloadStatus: {
					isAllowed: action.isBatchDownloadOk,
					ts: Date.now()
				}
			});

		case TEMPORAL_FILTER:
			return state.update({
				filterTemporal: action.filterTemporal,
				paging: state.paging.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText))
			});

		case FREE_TEXT_FILTER:
			let filterFreeText = updateFreeTextFilter(action.id, action.data, state.filterFreeText);

			return state.update({
				filterFreeText
			});

		case UPDATE_SELECTED_PIDS:
			filterFreeText = state.filterFreeText.withSelectedPids(action.selectedPids);

			return state.update({
				filterFreeText,
				paging: state.paging.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, filterFreeText))
			});

		case UPDATE_CHECKED_OBJECTS_IN_SEARCH:
			return state.update({
				checkedObjectsInSearch: action.checkedObjectsInSearch
			});

		case UPDATE_CHECKED_OBJECTS_IN_CART:
			return state.update({
				checkedObjectsInCart: action.checkedObjectsInCart
			});

		default:
			return state;
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
	const isEnabled = objCount > 0 && objCount <= 2000;
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
