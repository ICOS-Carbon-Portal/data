import {BackendPayload,	BackendTables, BackendUserInfo, BackendObjectMetadataId, BackendObjectMetadata,
	BackendOriginsTable} from "./actionpayloads";
import stateUtils, {State} from "../models/State";
import config from "../config";
import CompositeSpecTable from "../models/CompositeSpecTable";
import Paging from "../models/Paging";
import Lookup from "../models/Lookup";
import {getObjCount} from "./utils";


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
		return stateUtils.update(state, handleBackendTables(state, payload));
	}

	if (payload instanceof BackendOriginsTable){
		return stateUtils.update(state, handleOriginsTable(payload));
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

const handleOriginsTable = (payload: BackendOriginsTable) => {
	const specTable = payload.orgSpecTables.withOriginsTable(payload.dobjOriginsAndCounts);
	const objCount = getObjCount(specTable);

	return {
		specTable,
		paging: new Paging({objCount})
	}
};

const handleBackendTables = (state: State, payload: BackendTables) => {
	const specTable = CompositeSpecTable.deserialize(payload.allTables.specTables);
	const objCount = getObjCount(specTable);

	return {
		specTable,
		formatToRdfGraph: payload.allTables.formatToRdfGraph,
		paging: new Paging({objCount}),
		lookup: new Lookup(specTable)
	};
};
