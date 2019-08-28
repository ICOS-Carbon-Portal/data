import {actionTypes} from './actions';
import * as Toaster from 'icos-cp-toaster';
import State from './models/State';
import CompositeSpecTable from './models/CompositeSpecTable';
import Lookup from './models/Lookup';
import Preview from './models/Preview';
import config, {placeholders} from './config';
import Paging from './models/Paging';
import {getStateFromHash} from "./models/State";
import {MiscInit} from './actions';


const specTableKeys = Object.keys(placeholders);

export default function(state = new State(), action){

	if (action.payload instanceof MiscInit){
		return state.update(getStateFromHash());
	}

	switch(action.type){

		case actionTypes.ERROR:
			return state.update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case actionTypes.LOAD_ERROR:
			return State.deserialize(action.state, action.cart);

		// case actionTypes.WHOAMI_FETCHED:
		// 	return state.update({user: action.user});

		case actionTypes.USER_INFO_FETCHED:
			return state.update({
				user: {
					profile: action.profile,
					email: action.user.email
				}
			});

		case actionTypes.SPECTABLES_FETCHED:
			specTable = new CompositeSpecTable(action.specTables);
			let objCount = getObjCount(specTable);

			return state.update({
				specTable,
				formatToRdfGraph: action.formatToRdfGraph,
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				lookup: new Lookup(specTable)
			});

		case actionTypes.RESTORE_FILTERS:
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

		case actionTypes.RESTORE_FROM_HISTORY:
			return State.deserialize(action.historyState, state.cart);

		case actionTypes.SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);

			return state.update({
				specTable,
				objectsTable: [],
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: Object.assign(state.filterCategories, {[action.varName]: action.values}),
				checkedObjectsInSearch: []
			});

		case actionTypes.SPEC_FILTER_RESET:
			specTable = state.specTable.withResetFilters();
			objCount = getObjCount(specTable);

			return state.update({
				specTable,
				paging: new Paging({objCount}),
				sorting: updateSortingEnableness(state.sorting, objCount),
				filterCategories: {},
				checkedObjectsInSearch: []
			});

		case actionTypes.RESTORE_PREVIEW:
			return state.update({
				preview: state.preview.restore(state.lookup.table, state.cart, state.objectsTable)
			});

		case actionTypes.OBJECTS_FETCHED:
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

		case actionTypes.EXTENDED_DOBJ_INFO_FETCHED:
			return state.updateAndSave({
				extendedDobjInfo: action.extendedDobjInfo
			});

		case actionTypes.SORTING_TOGGLED:
			return state.update({
				objectsTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case actionTypes.STEP_REQUESTED:
			return state.update({
				objectsTable: [],
				paging: state.paging.withDirection(action.direction),
				page: state.page + action.direction
			});

		case actionTypes.ROUTE_UPDATED:
			return state.update({
				route: action.route,
				preview: action.route === config.ROUTE_PREVIEW ? state.preview : new Preview()
			});

		case actionTypes.SWITCH_TAB:
			paging = state.paging
				.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText))
				.withOffset(0);

			return state.update({
				tabs: Object.assign({}, state.tabs, {[action.tabName]: action.selectedTabId}),
				paging,
				page: 0
			});

		case actionTypes.METADATA:
			return state.update({
				route: config.ROUTE_METADATA,
				metadata: action.metadataWithId,
				id: action.metadataWithId.id
			});

		case actionTypes.PREVIEW:
			return state.update({
				route: config.ROUTE_PREVIEW,
				preview: state.preview.initPreview(state.lookup.table, state.cart, action.id, state.objectsTable)
			});

		case actionTypes.PREVIEW_VISIBILITY:
			return state.update({preview: action.visible ? state.preview.show() : state.preview.hide()});

		case actionTypes.PREVIEW_SETTING_UPDATED:
			return state.update({
				cart: action.cart,
				preview: state.preview.withItemSetting(action.setting, action.value, state.preview.type)
			});

		case actionTypes.ITEM_URL_UPDATED:
			return state.update({
				preview: state.preview.withItemUrl(action.url)
			});

		case actionTypes.CART_UPDATED:
			return state.update({
				cart: action.cart,
				checkedObjectsInCart: state.checkedObjectsInCart.filter(uri => action.cart.ids.includes(uri))
			});

		case actionTypes.TESTED_BATCH_DOWNLOAD:
			return state.update({
				user: action.user.email,
				batchDownloadStatus: {
					isAllowed: action.isBatchDownloadOk,
					ts: Date.now()
				}
			});

		case actionTypes.TEMPORAL_FILTER:
			return state.update({
				filterTemporal: action.filterTemporal,
				paging: state.paging.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, state.filterFreeText)),
				checkedObjectsInSearch: []
			});

		case actionTypes.FREE_TEXT_FILTER:
			let filterFreeText = updateFreeTextFilter(action.id, action.data, state.filterFreeText);

			return state.update({
				filterFreeText,
				checkedObjectsInSearch: []
			});

		case actionTypes.UPDATE_SELECTED_PIDS:
			filterFreeText = state.filterFreeText.withSelectedPids(action.selectedPids);

			return state.update({
				filterFreeText,
				paging: state.paging.withFiltersEnabled(areFiltersEnabled(state.tabs, state.filterTemporal, filterFreeText))
			});

		case actionTypes.UPDATE_CHECKED_OBJECTS_IN_SEARCH:
			return state.updateAndSave({
				checkedObjectsInSearch: updateCheckedObjects(state.checkedObjectsInSearch, action.checkedObjectInSearch)
			});

		case actionTypes.UPDATE_CHECKED_OBJECTS_IN_CART:
			return state.update({
				checkedObjectsInCart: updateCheckedObjects(state.checkedObjectsInCart, action.checkedObjectInCart)
			});

		case actionTypes.TS_SETTINGS:
			return state.update({
				tsSettings: action.tsSettings
			});

		case actionTypes.HELP_INFO_UPDATED:
			return state.update({
				helpStorage: state.helpStorage.withUpdatedItem(action.helpItem)
			});

		default:
			return state;
	}
}

const updateCheckedObjects = (existingObjs, newObj) => {
	if (Array.isArray(newObj)){
		return newObj.length === 0 ? [] : newObj;
	}

	return existingObjs.includes(newObj)
		? existingObjs.filter(o => o !== newObj)
		: existingObjs.concat([newObj]);
};

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
	const isEnabled = objCount <= config.dobjSortLimit;
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
