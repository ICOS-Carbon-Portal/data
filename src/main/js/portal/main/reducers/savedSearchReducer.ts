import stateUtils, {State} from "../models/State";
import {
	BootstrapRouteSavedSearch,
	SavedSearchPayload
} from "./actionpayloads";

export default function(state: State, payload: SavedSearchPayload): State{

	if (payload instanceof BootstrapRouteSavedSearch){
		return stateUtils.update(state,{
			savedSearches: payload.savedSearches
		});
	}

	return state;
}



