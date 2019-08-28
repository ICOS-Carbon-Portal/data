import {BackendPayload,	BackendTables, BackendUserInfo} from "../actions";
import State from "../models/State";

const subReducer: (s: State, payload: BackendPayload) => State = (state, payload) => {

	if (payload instanceof BackendUserInfo){
		return state.update({
			user: {
				profile: payload.profile,
				email: payload.user.email
			}
		});
	}

	if (payload instanceof BackendTables){
		return state.update({allTables: payload.allTables});
	}

	return state;

};

export default subReducer;
