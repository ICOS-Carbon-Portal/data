import stateUtils, {State} from "../models/State";
import {
	PreviewPayload,
	RestorePreview,
	SetPreviewFromCart,
	SetPreviewUrl
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

	return state;
}

const handleRestorePreview = (state: State) => {
	return state.lookup === undefined
		? {preview: new Preview()}
		: {preview: state.preview.restore(state.lookup.table, state.cart, state.objectsTable)};
};

const handleSetPreviewFromCart = (state: State, payload: SetPreviewFromCart): Partial<State> => {
	const preview = state.lookup === undefined
		? new Preview()
		: state.preview.initPreview(state.lookup.table, state.cart, payload.ids, state.objectsTable);

	return {
		route: 'preview',
		preview
	}
};
