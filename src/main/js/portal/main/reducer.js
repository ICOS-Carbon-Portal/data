import {actionTypes} from './actions';
import stateUtils, {defaultState} from './models/State';
import Preview from './models/Preview';
import config, {placeholders} from './config';
import Paging from './models/Paging';
import {getObjCount} from "./reducers/utils";


const specTableKeys = Object.keys(placeholders[config.envri]);

export default function(state = defaultState, action){

	switch(action.type){

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
			// Switching tab resets paging
			paging = state.paging
				.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterFreeText))
				.withOffset(0);

			return stateUtils.update(state,{
				tabs: Object.assign({}, state.tabs, {[action.tabName]: action.selectedTabId}),
				paging,
				page: 0
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
				paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterFreeText)),
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
				paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, filterFreeText))
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
