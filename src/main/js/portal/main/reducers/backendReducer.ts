import {BackendPayload,	BackendTables, BackendUserInfo} from "../actions";
import State from "../models/State";

export default function(state: State, payload: BackendPayload): State {

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
