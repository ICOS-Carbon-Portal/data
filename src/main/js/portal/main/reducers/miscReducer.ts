import {MiscError, MiscInit, MiscPayload} from "../actions";
import State from "../models/State";

export default function(state: State, payload: MiscPayload): State{

	if (payload instanceof MiscInit){
		return state;
	}

	if (payload instanceof MiscError){
		return state.update({error: payload.error});
	}

	return state;

};
