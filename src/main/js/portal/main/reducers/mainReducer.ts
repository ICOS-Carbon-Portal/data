import { Reducer } from 'redux';
import backendReducer from './backendReducer';
import miscReducer from './miscReducer';
import previewReducer from './previewReducer';
import uiReducer from './uiReducer';
import oldReducer from '../reducer';
import {BackendPayload, PortalPlainAction, MiscPayload, PreviewPayload, UiPayload} from "./actionpayloads";
import {State, defaultState} from "../models/State";


const reducer: Reducer<State, PortalPlainAction> = (state: State = defaultState, action: PortalPlainAction) => {
	const payload = action.payload;

	if (payload instanceof BackendPayload)
		return backendReducer(state, payload);

	if (payload instanceof MiscPayload)
		return miscReducer(state, payload);

	if (payload instanceof PreviewPayload)
		return previewReducer(state, payload);

	if (payload instanceof UiPayload)
		return uiReducer(state, payload);

	return oldReducer(state, action);
};

export default reducer;
