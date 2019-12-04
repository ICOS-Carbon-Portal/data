import {actionTypes} from './actions';
import stateUtils, {defaultState} from './models/State';


export default function(state = defaultState, action){

	switch(action.type){

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

		default:
			return state;
	}
}

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
