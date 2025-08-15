import stateUtils, {State} from "../models/State";
import {
	FiltersPayload,
	FiltersNumber,
	FiltersTemporal,
	FiltersUpdatePids,
	FiltersUpdateFileName,
	FilterKeywords
} from "./actionpayloads";
import {isInPidFilteringMode} from "./utils";

export default function(state: State, payload: FiltersPayload): State{

	if (payload instanceof FiltersTemporal){
		return stateUtils.update(state,{
			filterTemporal: payload.filterTemporal,
			paging: state.paging.withFiltersEnabled(isInPidFilteringMode(state.tabs, state.filterPids)),
			checkedObjectsInSearch: []
		});
	}

	if (payload instanceof FiltersUpdatePids){
		return stateUtils.update(state,{
			filterPids: payload.selectedPids,
			paging: state.paging
				.withFiltersEnabled(isInPidFilteringMode(state.tabs, state.filterPids))
				.withOffset(0),
			checkedObjectsInSearch: []
		});
	}

	if (payload instanceof FiltersUpdateFileName) {
		return stateUtils.update(state, {
			filterFileName: payload.fileName,
			checkedObjectsInSearch: []
		});
	}

	if (payload instanceof FiltersNumber){
		return stateUtils.update(state, {
			filterNumbers: state.filterNumbers.withFilter(payload.numberFilter),
			checkedObjectsInSearch: []
		});
	}

	if (payload instanceof FilterKeywords){
		return stateUtils.update(state, {
			filterKeywords: payload.filterKeywords,
			checkedObjectsInSearch: []
		});
	}

	return state;
}
