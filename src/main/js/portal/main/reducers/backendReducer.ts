import {BackendPayload,	BackendTables, BackendUserInfo, BackendObjectMetadataId, BackendObjectMetadata} from "../actions";
import stateUtils, {State} from "../models/State";
import config from "../config";

export default function(state: State, payload: BackendPayload): State {

	if (payload instanceof BackendUserInfo){
		return stateUtils.update(state, {
			user: {
				profile: payload.profile,
				email: payload.user.email
			}
		});
	}

	if (payload instanceof BackendTables){
		return stateUtils.update(state, {allTables: payload.allTables});
	}

	if (payload instanceof BackendObjectMetadataId){
		return stateUtils.update(state, {id: payload.id});
	}

	if (payload instanceof BackendObjectMetadata){
		return stateUtils.update(state, {
			route: config.ROUTE_METADATA,
			metadata: payload.metadata
		});
	}

	return state;

};
