import stateUtils, {State} from "../models/State";
import {UiPayload, UiStepRequested, UiSwitchTab, UiToggleSorting, UiUpdateRoute} from "./actionpayloads";
import config from "../config";
import Preview from "../models/Preview";
import {isPidFreeTextSearch} from "../reducer";

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

	if (payload instanceof UiUpdateRoute){
		return stateUtils.update(state,{
			route: payload.route,
			preview: payload.route === config.ROUTE_PREVIEW ? state.preview : new Preview()
		});
	}

	if (payload instanceof UiSwitchTab){
		return stateUtils.update(state, handleSwitchTab(state, payload));
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
	// Switching tab resets paging
	const paging = state.paging
		.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterFreeText))
		.withOffset(0);

	return stateUtils.update(state,{
		tabs: Object.assign({}, state.tabs, {[payload.tabName]: payload.selectedTabId}),
		paging,
		page: 0
	});
};
