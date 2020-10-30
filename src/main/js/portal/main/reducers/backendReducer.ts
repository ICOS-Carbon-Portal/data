import {
	BackendPayload, BootstrapInfo, BackendUserInfo, BackendObjectMetadataId, BackendObjectMetadata,
	BackendOriginsTable, BackendUpdateSpecFilter, BackendObjectsFetched, BackendExtendedDataObjInfo,
	BackendTsSettings, BackendBatchDownload, BackendUpdateCart, BackendExportQuery
} from "./actionpayloads";
import stateUtils, {ObjectsTable, State} from "../models/State";
import config from "../config";
import CompositeSpecTable from "../models/CompositeSpecTable";
import Paging from "../models/Paging";
import PreviewLookup from "../models/PreviewLookup";
import {getObjCount, isPidFreeTextSearch} from "./utils";
import {IdxSig} from "../backend/declarations";


export default function(state: State, payload: BackendPayload): State {

	if (payload instanceof BackendUserInfo){
		return stateUtils.update(state, handleUserInfo(state, payload));
	}

	if (payload instanceof BackendBatchDownload){
		return stateUtils.update(state, handleBatchDownload(state, payload));
	}

	if (payload instanceof BootstrapInfo){
		return stateUtils.update(state, bootstrapInfoUpdates(state, payload));
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
			route: 'metadata',
			metadata: payload.metadata
		});
	}

	if (payload instanceof BackendObjectsFetched){
		return stateUtils.update(state, handleObjectsFetched(state, payload));
	}

	if (payload instanceof BackendExportQuery) {
		return stateUtils.update(state, {
			exportQuery: payload
		});
	}

	if (payload instanceof BackendExtendedDataObjInfo) {
		// Save updates in history state if we are beyond init procedure since this is called last for the search route
		const updater = state.isRunningInit
			? stateUtils.update
			: stateUtils.updateAndSave;

		return updater(state, handleExtendedDataObjInfo(state, payload));
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

const handleExtendedDataObjInfo = (state: State, payload: BackendExtendedDataObjInfo): Pick<State, 'extendedDobjInfo' | 'previewLookup'> => {
	const varInfo = payload.extendedDobjInfo
		.reduce<IdxSig<boolean>>((acc, ext) => {
			acc[ext.dobj] = ext.hasVarInfo ?? false;
			return acc;
		}, {});
	
	return {
		extendedDobjInfo: payload.extendedDobjInfo,
		previewLookup: state.previewLookup?.withVarInfo(varInfo)
	};
};

const handleObjectsFetched = (state: State, payload: BackendObjectsFetched) => {
	const objectsTable = payload.objectsTable as ObjectsTable[];
	const extendedObjectsTable = objectsTable.map(ot => {
		const spec = state.specTable.getTableRows('basics').find(r => r.spec === ot.spec);
		return {...ot, ...spec};
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

	return stateUtils.update(state,{
		specTable,
		objectsTable: [],
		...getNewPaging(state.paging, state.page, specTable, true),
		filterCategories: Object.assign(state.filterCategories, {[payload.varName]: payload.filter}),
		checkedObjectsInSearch: []
	});
};

const handleOriginsTable = (state: State, payload: BackendOriginsTable) => {
	const useExtraFilter = state.filterTemporal.hasFilter || state.filterNumbers.hasFilters || state.filterKeywords.length > 0;

	const specTable = state.specTable.withOriginsTable(payload.dobjOriginsAndCounts, useExtraFilter);

	if (isPidFreeTextSearch(state.tabs, state.filterPids)) return {specTable};

	return {
		specTable,
		...getNewPaging(state.paging, state.page, specTable, payload.resetPaging)
	}
};

export const getNewPaging = (currentPaging: Paging, currentPage: number, specTable: CompositeSpecTable, resetPaging: boolean) => {
	const objCount = getObjCount(specTable);

	if (resetPaging){
		return {
			paging: new Paging({objCount}),
			page: 0
		};

	} else {
		const pageCount = Math.min(objCount, config.stepsize);
		return {
			paging: currentPaging.withObjCount({objCount, pageCount}),
			page: currentPage
		};
	}
};

function bootstrapInfoUpdates(state: State, payload: BootstrapInfo): Partial<State> {
	const specTable = CompositeSpecTable.deserialize(payload.info.specTables);

	const labelLookup = payload.info.labelLookup.reduce<IdxSig>((acc, curr) => {
		acc[curr.uri] = curr.label;
		return acc;
	}, {});

	return {
		specTable,
		labelLookup,
		...getNewPaging(state.paging, state.page, specTable, false),
		previewLookup: new PreviewLookup(specTable, labelLookup),
		keywords: payload.info.keywords
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
