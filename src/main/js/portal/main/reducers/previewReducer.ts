import stateUtils, {State} from "../models/State";
import {PreviewPayload, RestorePreview, SetPreviewFromCart, SetPreviewItem, SetPreviewUrls} from "./actionpayloads";
import Preview from "../models/Preview";
import {Sha256Str} from "../backend/declarations";


export default function(state: State, payload: PreviewPayload): State{

	if (payload instanceof RestorePreview){
		return stateUtils.update(state, handleRestorePreview(state));
	}

	if (payload instanceof SetPreviewFromCart){
		return stateUtils.update(state, handleSetPreviewFromCart(state, payload));
	}

	if (payload instanceof SetPreviewUrls){
		return stateUtils.update(state, handleSetPreviewUrls(state, payload));
	}

	if (payload instanceof SetPreviewItem){
		return stateUtils.update(state,{
			preview: state.preview.withItemUrl(payload.url)
		});
	}

	return state;
}

const handleSetPreviewUrls = (state: State, payload: SetPreviewUrls) => {
	const pids: Sha256Str[] = payload.urls.map(url => url.split('/').pop()!);

	return {
		preview: state.preview.withPids(pids)
	};
};

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
