import stateUtils, {State, ObjectsTable} from "../models/State";
import {
	BootstrapRouteCart,
	BootstrapRouteMetadata,
	BootstrapRoutePayload,
	BootstrapRoutePreview, BootstrapRouteSearch, ObjectsTableLike
} from "./actionpayloads";
import Preview from "../models/Preview";
import CompositeSpecTable from "../models/CompositeSpecTable";
import PreviewLookup from "../models/PreviewLookup";

// Make sure state updates here forces isRunningInit to false
type BootstrapState = Partial<State> & {isRunningInit: false}

export default function(state: State, payload: BootstrapRoutePayload): State {

	if (payload instanceof BootstrapRouteSearch){
		// Let reducer BackendExtendedDataObjInfo handle save to history state
		return stateUtils.update(state,{
			route: 'search',
			isRunningInit: false
		} as BootstrapState);
	}

	if (payload instanceof BootstrapRoutePreview){
		return handleRoutePreview(state, payload);
	}

	if (payload instanceof BootstrapRouteMetadata){
		return handleRouteMetadata(state, payload);
	}

	if (payload instanceof BootstrapRouteCart){
		return handleRouteCart(state, payload);
	}

	return state;
}

const getObjectsTable = (specTable: CompositeSpecTable, objectsTable: ObjectsTableLike) => {
	return (objectsTable as ObjectsTable[]).map(ot => {
		const spec = specTable.getTableRows('basics').find(r => r.spec === ot.spec);
		return {...ot, ...spec};
	});
};

const handleRoutePreview = (state: State, payload: BootstrapRoutePreview): State => {
	const specTable = payload.specTables === undefined
		? state.specTable
		: CompositeSpecTable.deserialize(payload.specTables);
	const objectsTable = getObjectsTable(specTable, payload.objectsTable);
	const labelLookup = payload.labelLookup ?? state.labelLookup;
	const previewLookup = state.previewLookup === undefined
		? new PreviewLookup(specTable, labelLookup)
		: state.previewLookup;

	const preview = state.preview
			.withPids(payload.pids)
			.restore(previewLookup, state.cart, objectsTable);

	const newPartialState: BootstrapState = {
		route: 'preview',
		specTable,
		labelLookup,
		objectsTable,
		extendedDobjInfo: payload.extendedDobjInfo,
		preview,
		previewLookup,
		isRunningInit: false
	};

	return state.isRunningInit
		? stateUtils.updateAndSave(state, newPartialState)
		: stateUtils.update(state, newPartialState);
};

const handleRouteMetadata = (state: State, payload: BootstrapRouteMetadata): State => {
	const objectsTable = payload.objectsTable
		? getObjectsTable(state.specTable, payload.objectsTable)
		: state.objectsTable;
	const newPartialState: BootstrapState = {
		route: 'metadata',
		id: payload.id,
		metadata: payload.metadata,
		objectsTable,
		isRunningInit: false
	};

	return state.isRunningInit
		? stateUtils.updateAndSave(state, newPartialState)
		: stateUtils.update(state, newPartialState);
};

const handleRouteCart = (state: State, payload: BootstrapRouteCart): State => {
	const objectsTable = getObjectsTable(state.specTable, payload.objectsTable);

	const newPartialState: BootstrapState = {
		route: 'cart',
		objectsTable,
		extendedDobjInfo: payload.extendedDobjInfo,
		isRunningInit: false
	};

	return state.isRunningInit
		? stateUtils.updateAndSave(state, newPartialState)
		: stateUtils.update(state, newPartialState);
};
