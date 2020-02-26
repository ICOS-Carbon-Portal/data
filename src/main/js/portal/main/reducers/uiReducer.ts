import stateUtils, {State} from "../models/State";
import {
	UiAddHelpInfo, UiInactivateAllHelp,
	UiPayload,
	UiStepRequested,
	UiSwitchTab,
	UiToggleSorting, UiUpdateCheckedObjsInCart, UiUpdateCheckedObjsInSearch,
	UiUpdateHelpInfo
} from "./actionpayloads";
import config from "../config";
import {isPidFreeTextSearch} from "./utils";
import {UrlStr} from "../backend/declarations";

export default function(state: State, payload: UiPayload): State{

	if (payload instanceof UiToggleSorting){
		return stateUtils.update(state, handleToggleSorting(state, payload));
	}

	if (payload instanceof UiStepRequested){
		return stateUtils.update(state,{
			objectsTable: [],
			paging: state.paging.withDirection(payload.direction),
			page: state.page + payload.direction
		});
	}

	if (payload instanceof UiSwitchTab){
		return stateUtils.update(state, handleSwitchTab(state, payload));
	}

	if (payload instanceof UiAddHelpInfo){
		return stateUtils.update(state,{
			helpStorage: state.helpStorage.withNewItem(payload.helpItem)
		});
	}

	if (payload instanceof UiUpdateHelpInfo){
		return stateUtils.update(state,{
			helpStorage: state.helpStorage.withUpdatedItem(payload.helpItem)
		});
	}

	if (payload instanceof UiInactivateAllHelp){
		return stateUtils.update(state,{
			helpStorage: state.helpStorage.setAllInactive()
		});
	}

	if (payload instanceof UiUpdateCheckedObjsInSearch){
		return stateUtils.updateAndSave(state,{
			checkedObjectsInSearch: updateCheckedObjects(state.checkedObjectsInSearch, payload.checkedObjectInSearch)
		});
	}

	if (payload instanceof UiUpdateCheckedObjsInCart){
		return stateUtils.update(state,{
			checkedObjectsInCart: updateCheckedObjects(state.checkedObjectsInCart, payload.checkedObjectInCart)
		});
	}

	return state;
}

const handleToggleSorting = (state: State, payload: UiToggleSorting) => {
	const ascending = state.sorting.varName === payload.varName
		? !state.sorting.ascending
		: true;

	return {
		objectsTable: [],
		sorting: {varName: payload.varName, ascending}
	};
};

const handleSwitchTab = (state: State, payload: UiSwitchTab) => {
	const tabs = {...state.tabs, ...{[payload.tabName]: payload.selectedTabId}};
	const hasPidSearchResult = isPidFreeTextSearch(tabs, state.filterPids);
	const offset = hasPidSearchResult ? 0 : state.paging.offset;

	return stateUtils.update(state,{
		tabs,
		paging: state.paging
			.withFiltersEnabled(hasPidSearchResult)
			.withOffset(offset),
		page: offset / config.stepsize
	});
};

const updateCheckedObjects = (existingObjs: UrlStr[], newObj: UrlStr | UrlStr[]) => {
	if (Array.isArray(newObj)){
		return newObj.length === 0 ? [] : newObj;
	}

	return existingObjs.includes(newObj)
		? existingObjs.filter(o => o !== newObj)
		: existingObjs.concat([newObj]);
};
