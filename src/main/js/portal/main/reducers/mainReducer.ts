import { Reducer } from 'redux';
import backendReducer from './backendReducer';
import miscReducer from './miscReducer';
import oldReducer from '../reducer';
import {BackendPayload,	IPortalPlainAction,	MiscPayload} from "../actions";
import State from "../models/State";


const reducer: Reducer<State, IPortalPlainAction> = (state: State = new State(), action: IPortalPlainAction) => {
	const payload = action.payload;

	if (payload instanceof BackendPayload)
		return backendReducer(state, payload);

	if (payload instanceof MiscPayload)
		return miscReducer(state, payload);

	return oldReducer(state, action);
};

export default reducer;
