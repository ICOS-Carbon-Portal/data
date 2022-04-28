import stateUtils, {State} from "../models/State";
import {
	SavedSearchPayload,
	UpdateSavedSearch
} from "./actionpayloads";

export default function(state: State, payload: SavedSearchPayload): State{

	if (payload instanceof UpdateSavedSearch){
		return stateUtils.update(state,{
			savedSearches: payload.savedSearches
		});
	}

	return state;
}



