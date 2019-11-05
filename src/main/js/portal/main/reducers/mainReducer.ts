import { Reducer } from 'redux';
import backendReducer from './backendReducer';
import miscReducer from './miscReducer';
import oldReducer from '../reducer';
import {BackendPayload,	PortalPlainAction,	MiscPayload} from "../actions";
import {State, defaultState} from "../models/State";


const reducer: Reducer<State, PortalPlainAction> = (state: State = defaultState, action: PortalPlainAction) => {
	const payload = action.payload;

	if (payload instanceof BackendPayload)
		return backendReducer(state, payload);

	if (payload instanceof MiscPayload)
		return miscReducer(state, payload);

	return oldReducer(state, action);
};

export default reducer;
