import stateUtils, {State} from "../models/State";
import {PreviewPayload, RestorePreview, SetPreviewFromCart, SetPreviewItem} from "./actionpayloads";
import Preview from "../models/Preview";
import config from "../config";


export default function(state: State, payload: PreviewPayload): State{

	if (payload instanceof RestorePreview){
		return stateUtils.update(state, handleRestorePreview(state));
	}

	if (payload instanceof SetPreviewFromCart){
		return stateUtils.update(state, handleSetPreviewFromCart(state, payload));
	}

	if (payload instanceof SetPreviewItem){
		return stateUtils.update(state,{
			preview: state.preview.withItemUrl(payload.url)
		});
	}

	return state;
}

const handleRestorePreview = (state: State) => {
	return state.lookup === undefined
		? {preview: new Preview()}
		: {preview: state.preview.restore(state.lookup.table, state.cart, state.objectsTable)};
};

const handleSetPreviewFromCart = (state: State, payload: SetPreviewFromCart) => {
	const preview = state.lookup === undefined
		? new Preview()
		: state.preview.initPreview(state.lookup.table, state.cart, payload.id, state.objectsTable);

	return {
		route: config.ROUTE_PREVIEW,
		preview
	}
};
