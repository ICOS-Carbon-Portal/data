import { Reducer } from 'redux';
import backendReducer from './backendReducer';
import miscReducer from './miscReducer';
import previewReducer from './previewReducer';
import uiReducer from './uiReducer';
import filtersReducer from './filtersReducer';
import {
	BackendPayload,
	PortalPlainAction,
	MiscPayload,
	PreviewPayload,
	UiPayload,
	FiltersPayload,
	BootstrapRoutePayload
} from "./actionpayloads";
import {State, defaultState} from "../models/State";
import bootstrapRouteReducer from "./bootstrapRouteReducer";


const reducer: Reducer<State, PortalPlainAction> = (state: State = defaultState, action: PortalPlainAction) => {
	const payload = action.payload;

	if (payload instanceof BootstrapRoutePayload)
		return bootstrapRouteReducer(state, payload);

	if (payload instanceof BackendPayload)
		return backendReducer(state, payload);

	if (payload instanceof MiscPayload)
		return miscReducer(state, payload);

	if (payload instanceof PreviewPayload)
		return previewReducer(state, payload);

	if (payload instanceof UiPayload)
		return uiReducer(state, payload);

	if (payload instanceof FiltersPayload)
		return filtersReducer(state, payload);

	return state;
};

export default reducer;
