import {actionTypes} from './actions';
import * as Toaster from 'icos-cp-toaster';
import stateUtils, {defaultState} from './models/State';
import Preview from './models/Preview';
import config, {placeholders} from './config';
import Paging from './models/Paging';
import {getObjCount} from "./reducers/utils";


const specTableKeys = Object.keys(placeholders[config.envri]);

export default function(state = defaultState, action){

	switch(action.type){

		case actionTypes.ERROR:
			return stateUtils.update(state,{
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case actionTypes.LOAD_ERROR:
			return stateUtils.deserialize(action.state, action.cart);

		case actionTypes.USER_INFO_FETCHED:
			return stateUtils.update(state,{
				user: {
					profile: action.profile,
					email: action.user.email
				}
			});

		case actionTypes.RESTORE_FILTERS:
			let {filterCategories, page} = state;
			let specTable = getSpecTable(state.specTable, filterCategories);
			let objCount = getObjCount(specTable);
			let paging = new Paging({objCount, offset: page * config.stepsize});

			return stateUtils.update(state,{
				specTable,
				objectsTable: [],
				paging
			});

		case actionTypes.RESTORE_FROM_HISTORY:
			return stateUtils.deserialize(action.historyState, state.cart);

		case actionTypes.SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);

			return stateUtils.update(state,{
				specTable,
				objectsTable: [],
				paging: new Paging({objCount}),
				filterCategories: Object.assign(state.filterCategories, {[action.varName]: action.values}),
				checkedObjectsInSearch: []
			});

		case actionTypes.RESTORE_PREVIEW:
			return stateUtils.update(state,{
				preview: state.preview.restore(state.lookup.table, state.cart, state.objectsTable)
			});

		case actionTypes.OBJECTS_FETCHED:
			const extendedObjectsTable = action.objectsTable.map(ot => {
				const spec = state.specTable.getTableRows('basics').find(r => r.spec === ot.spec);
				return Object.assign(ot, spec);
			});
			paging = state.paging.withObjCount({
				objCount: getObjCount(state.specTable),
				pageCount: action.objectsTable.length,
				filtersEnabled: isPidFreeTextSearch(state.tabs, state.filterTemporal, state.filterFreeText),
				cacheSize: action.cacheSize,
				isDataEndReached: action.isDataEndReached
			});
			objCount = paging.isCountKnown ? paging.objCount : getObjCount(state.specTable);
			return stateUtils.update(state,{
				objectsTable: extendedObjectsTable,
				paging
			});

		case actionTypes.EXTENDED_DOBJ_INFO_FETCHED:
			return stateUtils.updateAndSave(state,{
				extendedDobjInfo: action.extendedDobjInfo
			});

		case actionTypes.SORTING_TOGGLED:
			return stateUtils.update(state,{
				objectsTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case actionTypes.STEP_REQUESTED:
			return stateUtils.update(state,{
				objectsTable: [],
				paging: state.paging.withDirection(action.direction),
				page: state.page + action.direction
			});

		case actionTypes.ROUTE_UPDATED:
			return stateUtils.update(state,{
				route: action.route,
				preview: action.route === config.ROUTE_PREVIEW ? state.preview : new Preview()
			});

		case actionTypes.SWITCH_TAB:
			paging = state.paging
				.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterTemporal, state.filterFreeText))
				.withOffset(0);

			return stateUtils.update(state,{
				tabs: Object.assign({}, state.tabs, {[action.tabName]: action.selectedTabId}),
				paging,
				page: 0
			});

		case actionTypes.PREVIEW:
			return stateUtils.update(state,{
				route: config.ROUTE_PREVIEW,
				preview: state.preview.initPreview(state.lookup.table, state.cart, action.id, state.objectsTable)
			});

		case actionTypes.PREVIEW_VISIBILITY:
			return stateUtils.update(state,{preview: action.visible ? state.preview.show() : state.preview.hide()});

		case actionTypes.PREVIEW_SETTING_UPDATED:
			return stateUtils.update(state,{
				cart: action.cart,
				preview: state.preview.withItemSetting(action.setting, action.value, state.preview.type)
			});

		case actionTypes.ITEM_URL_UPDATED:
			return stateUtils.update(state,{
				preview: state.preview.withItemUrl(action.url)
			});

		case actionTypes.CART_UPDATED:
			return stateUtils.update(state,{
				cart: action.cart,
				checkedObjectsInCart: state.checkedObjectsInCart.filter(uri => action.cart.ids.includes(uri))
			});

		case actionTypes.TESTED_BATCH_DOWNLOAD:
			return stateUtils.update(state,{
				user: action.user.email,
				batchDownloadStatus: {
					isAllowed: action.isBatchDownloadOk,
					ts: Date.now()
				}
			});

		case actionTypes.TEMPORAL_FILTER:
			return stateUtils.update(state,{
				filterTemporal: action.filterTemporal,
				paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterTemporal, state.filterFreeText)),
				checkedObjectsInSearch: []
			});

		case actionTypes.FREE_TEXT_FILTER:
			let filterFreeText = updateFreeTextFilter(action.id, action.data, state.filterFreeText);

			return stateUtils.update(state,{
				filterFreeText,
				checkedObjectsInSearch: []
			});

		case actionTypes.UPDATE_SELECTED_PIDS:
			filterFreeText = state.filterFreeText.withSelectedPids(action.selectedPids);

			return stateUtils.update(state,{
				filterFreeText,
				paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterTemporal, filterFreeText))
			});

		case actionTypes.UPDATE_CHECKED_OBJECTS_IN_SEARCH:
			return stateUtils.updateAndSave(state,{
				checkedObjectsInSearch: updateCheckedObjects(state.checkedObjectsInSearch, action.checkedObjectInSearch)
			});

		case actionTypes.UPDATE_CHECKED_OBJECTS_IN_CART:
			return stateUtils.update(state,{
				checkedObjectsInCart: updateCheckedObjects(state.checkedObjectsInCart, action.checkedObjectInCart)
			});

		case actionTypes.TS_SETTINGS:
			return stateUtils.update(state,{
				tsSettings: action.tsSettings
			});

		case actionTypes.HELP_INFO_UPDATED:
			return stateUtils.update(state,{
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

export const isPidFreeTextSearch = (tabs, filterFreeText) => {
	return tabs.searchTab === 1  && filterFreeText !== undefined && filterFreeText.hasFilter;
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

function getSpecTable(startTable, filterCategories){
	return Object.keys(filterCategories).reduce((specTable, varName) => {
		return specTableKeys.includes(varName)
			? specTable.withFilter(varName, filterCategories[varName])
			: specTable;
	}, startTable);
}
