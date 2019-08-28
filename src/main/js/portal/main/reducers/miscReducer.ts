import {MiscError, MiscInit, MiscPayload} from "../actions";
import State from "../models/State";

const subReducer: (s: State, payload: MiscPayload) => State = (state, payload) => {

	if (payload instanceof MiscInit){
		return state;
	}

	if (payload instanceof MiscError){
		return state.update({error: payload.error});
	}

	return state;

};

export default subReducer;
