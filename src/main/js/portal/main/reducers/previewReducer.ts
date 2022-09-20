import stateUtils, {State} from "../models/State";
import {
	PreviewPayload,
	RestorePreview,
	SetPreviewFromCart,
	SetPreviewUrl,
	SetPreviewYAxis,
	SetPreviewY2Axis
} from "./actionpayloads";
import Preview from "../models/Preview";


export default function(state: State, payload: PreviewPayload): State{

	if (payload instanceof RestorePreview){
		return stateUtils.update(state, handleRestorePreview(state));
	}

	if (payload instanceof SetPreviewFromCart){
		return stateUtils.update(state, handleSetPreviewFromCart(state, payload));
	}

	if (payload instanceof SetPreviewUrl){
		// Save exact state of Preview in history when it's URL changes.
		// This will recreate all changes in the preview when navigating back to it.
		return stateUtils.updateAndSave(state,{
			preview: state.preview.withItemUrl(payload.url)
		});
	}

	if (payload instanceof SetPreviewYAxis) {
		return stateUtils.update(state, {
			yAxis: payload.yAxis,
		});
	}

	if (payload instanceof SetPreviewY2Axis) {
		return stateUtils.update(state, {
			y2Axis: payload.y2Axis,
		});
	}

	return state;
}

const handleRestorePreview = (state: State) => {
	return state.previewLookup === undefined
		? {preview: new Preview()}
		: {preview: state.preview.restore(state.previewLookup, state.cart, state.objectsTable)};
};

const handleSetPreviewFromCart = (state: State, payload: SetPreviewFromCart): Partial<State> => {
	const preview = state.previewLookup === undefined
		? new Preview()
		: state.preview.initPreview(state.previewLookup, state.cart, payload.ids, state.objectsTable, state.yAxis, state.y2Axis);

	return {
		route: 'preview',
		preview
	}
};
