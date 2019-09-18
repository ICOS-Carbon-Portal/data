import {BackendPayload,	BackendTables, BackendUserInfo, BackendObjectMetadataId, BackendObjectMetadata} from "../actions";
import State from "../models/State";
import config from "../config";

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

	if (payload instanceof BackendObjectMetadataId){
		return state.update({metadataId: payload.id});
	}

	if (payload instanceof BackendObjectMetadata){
		return state.update({
			route: config.ROUTE_METADATA,
			metadata: payload.metadata
		});
	}

	return state;

};
