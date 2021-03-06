import stateUtils, {State} from "../models/State";
import {
	FiltersPayload,
	FiltersNumber,
	FiltersTemporal,
	FiltersUpdatePids,
	FilterKeywords
} from "./actionpayloads";
import {isPidFreeTextSearch} from "./utils";

export default function(state: State, payload: FiltersPayload): State{

	if (payload instanceof FiltersTemporal){
		return stateUtils.update(state,{
			filterTemporal: payload.filterTemporal,
			paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterPids)),
			checkedObjectsInSearch: []
		});
	}

	if (payload instanceof FiltersUpdatePids){
		return stateUtils.update(state,{
			filterPids: payload.selectedPids,
			paging: state.paging
				.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterPids))
				.withOffset(0)
		});
	}

	if (payload instanceof FiltersNumber){
		return stateUtils.update(state, {
			filterNumbers: state.filterNumbers.withFilter(payload.numberFilter)
		});
	}

	if (payload instanceof FilterKeywords){
		return stateUtils.update(state, {filterKeywords: payload.keywords});
	}

	return state;
}
