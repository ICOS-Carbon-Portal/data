import stateUtils, {State} from "../models/State";
import {FiltersPayload, FiltersTemporal, FiltersUpdatePids} from "./actionpayloads";
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
			paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterPids))
		});
	}

	return state
}
