import stateUtils, {State, ObjectsTable} from "../models/State";
import {
	BootstrapRouteCart,
	BootstrapRouteMetadata,
	BootstrapRoutePayload,
	BootstrapRoutePreview, BootstrapRouteSearch, ObjectsTableLike
} from "./actionpayloads";
import CompositeSpecTable from "../models/CompositeSpecTable";
import PreviewLookup from "../models/PreviewLookup";
import Cart from "../models/Cart";
import CartItem from "../models/CartItem";
import Preview from "../models/Preview";

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
	const previewLookup = state.previewLookup ?? PreviewLookup.init(specTable, labelLookup)
	const cart = new Cart(state.cart.name, state.cart.ids.map(id => {
		const objInfo = objectsTable.find(o => o.dobj === id);
		return new CartItem(id, objInfo);
	}))

	const previewSettings = state.route === "preview" ? state.previewSettings : Preview.parsePreviewSettings({});
	const preview = state.preview
			.withPids(payload.pids, previewSettings)
			.restore(previewLookup, cart, objectsTable);

	const newPartialState: BootstrapState = {
		route: 'preview',
		specTable,
		labelLookup,
		objectsTable,
		extendedDobjInfo: payload.extendedDobjInfo,
		preview,
		previewLookup,
		previewSettings,
		cart,
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
	const labelLookup = payload.labelLookup ?? state.labelLookup;
	const cart = new Cart(state.cart.name, state.cart.ids.map(id => {
		const objInfo = objectsTable.find(o => o.dobj === id);
		const previewType = objInfo ? state.previewLookup?.forDataObjSpec(objInfo.spec) : undefined
		return new CartItem(id, objInfo, previewType?.type);
	}))

	const newPartialState: BootstrapState = {
		route: 'cart',
		labelLookup,
		objectsTable,
		extendedDobjInfo: payload.extendedDobjInfo,
		cart,
		isRunningInit: false
	};

	return state.isRunningInit
		? stateUtils.updateAndSave(state, newPartialState)
		: stateUtils.update(state, newPartialState);
};
