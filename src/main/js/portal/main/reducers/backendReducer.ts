import {
	BackendPayload, BackendTables, BackendUserInfo, BackendObjectMetadataId, BackendObjectMetadata,
	BackendOriginsTable, BackendUpdateSpecFilter, BackendObjectsFetched, BackendExtendedDataObjInfo,
	BackendTsSettings, BackendBatchDownload, BackendUpdateCart
} from "./actionpayloads";
import stateUtils, {ObjectsTable, State} from "../models/State";
import config from "../config";
import CompositeSpecTable from "../models/CompositeSpecTable";
import Paging from "../models/Paging";
import Lookup from "../models/Lookup";
import {getObjCount, isPidFreeTextSearch} from "./utils";


export default function(state: State, payload: BackendPayload): State {

	if (payload instanceof BackendUserInfo){
		return stateUtils.update(state, handleUserInfo(state, payload));
	}

	if (payload instanceof BackendBatchDownload){
		return stateUtils.update(state, handleBatchDownload(state, payload));
	}

	if (payload instanceof BackendTables){
		return stateUtils.update(state, handleBackendTables(state, payload));
	}

	if (payload instanceof BackendOriginsTable){
		return stateUtils.update(state, handleOriginsTable(state, payload));
	}

	if (payload instanceof BackendUpdateSpecFilter){
		return stateUtils.update(state, handleSpecFilterUpdate(state, payload));
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

	if (payload instanceof BackendObjectsFetched){
		return stateUtils.update(state, handleObjectsFetched(state, payload));
	}

	if (payload instanceof BackendExtendedDataObjInfo){
		return stateUtils.updateAndSave(state,{
			extendedDobjInfo: payload.extendedDobjInfo
		});
	}

	if (payload instanceof BackendTsSettings){
		return stateUtils.update(state,{
			tsSettings: payload.tsSettings
		});
	}

	if (payload instanceof BackendUpdateCart){
		return stateUtils.update(state,{
			cart: payload.cart,
			checkedObjectsInCart: state.checkedObjectsInCart.filter(uri => payload.cart.ids.includes(uri))
		});
	}

	return state;

};

const handleObjectsFetched = (state: State, payload: BackendObjectsFetched) => {
	const objectsTable = payload.objectsTable as ObjectsTable[];
	const extendedObjectsTable = objectsTable.map(ot => {
		const spec = state.specTable.getTableRows('basics').find(r => r.spec === ot.spec);
		return Object.assign(ot, spec);
	});
	const paging = state.paging.withObjCount({
		objCount: getObjCount(state.specTable),
		pageCount: payload.objectsTable.length,
		filtersEnabled: isPidFreeTextSearch(state.tabs, state.filterPids),
		isDataEndReached: payload.isDataEndReached
	});

	return {
		objectsTable: extendedObjectsTable,
		paging
	};
};

const handleSpecFilterUpdate = (state: State, payload: BackendUpdateSpecFilter) => {
	const specTable = state.specTable.withFilter(payload.varName, payload.filter);
	const objCount = getObjCount(specTable);

	return stateUtils.update(state,{
		specTable,
		objectsTable: [],
		page: 0,
		paging: new Paging({objCount}),
		filterCategories: Object.assign(state.filterCategories, {[payload.varName]: payload.filter}),
		checkedObjectsInSearch: []
	});
};

const handleOriginsTable = (state: State, payload: BackendOriginsTable) => {
	const {filterTemporal} = state;
	const orgSpecTables = state.specTable;
	const specTable = orgSpecTables.withOriginsTable(payload.dobjOriginsAndCounts, filterTemporal.hasFilter);

	if(isPidFreeTextSearch(state.tabs, state.filterPids)) return {specTable}

	const objCount = getObjCount(specTable);
	const pageCount = Math.min(objCount, config.stepsize);

	return {
		specTable,
		paging: state.paging.withObjCount({objCount, pageCount})
	}
};

const handleBackendTables = (state: State, payload: BackendTables) => {
	const specTable = CompositeSpecTable.deserialize(payload.allTables.specTables);
	const objCount = getObjCount(specTable);

	return {
		specTable,
		formatToRdfGraph: payload.allTables.formatToRdfGraph,
		paging: state.paging.withObjCount({objCount}),
		lookup: new Lookup(specTable)
	};
};

const handleUserInfo = (state: State, payload: BackendUserInfo) => {
	return {
		user: {
			profile: payload.profile,
			email: payload.user.email
		}
	};
};

const handleBatchDownload = (state: State, payload: BackendBatchDownload) => {
	return {
		user: Object.assign({}, state.user, payload.user),
		batchDownloadStatus: {
			isAllowed: payload.isBatchDownloadOk,
			ts: Date.now()
		}
	};
};
