import { Reducer } from 'redux';
import backendReducer from './backendReducer';
import miscReducer from './miscReducer';
import oldReducer from '../reducer';
import {BackendPayload,	IPortalPlainAction,	MiscPayload} from "../actions";
import State from "../models/State";


const reducer: Reducer<State, IPortalPlainAction> = (state: State = new State(), action: IPortalPlainAction) => {
	const payload = action.payload;

	const result = (payload instanceof BackendPayload)
		? backendReducer(state, payload)
		: (payload instanceof MiscPayload)
			? miscReducer(state, payload)
			: state;

	return (result === state) ? oldReducer(state, action) : result;
};

export default reducer;
