import {actionTypes} from './actions';
import stateUtils, {defaultState} from './models/State';
import {isPidFreeTextSearch} from "./reducers/utils";


export default function(state = defaultState, action){

	switch(action.type){

		case actionTypes.TEMPORAL_FILTER:
			return stateUtils.update(state,{
				filterTemporal: action.filterTemporal,
				paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, state.filterPids)),
				checkedObjectsInSearch: []
			});

		case actionTypes.UPDATE_SELECTED_PIDS:
			const {filterPids} = state;

			return stateUtils.update(state,{
				filterPids: action.selectedPids,
				paging: state.paging.withFiltersEnabled(isPidFreeTextSearch(state.tabs, filterPids))
			});

		default:
			return state;
	}
}
