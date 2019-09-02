import { Reducer } from 'redux';
import backendReducer from './backendReducer';
import miscReducer from './miscReducer';
import oldReducer from '../reducer';
import {BackendPayload,	IPortalPlainAction,	MiscPayload} from "../actions";
import State from "../models/State";


const reducer: Reducer<State, IPortalPlainAction> = (state: State = new State(), action: IPortalPlainAction) => {
	const payload = action.payload;

	switch (payload) {
		case payload instanceof BackendPayload:
			return backendReducer(state, payload);

		case payload instanceof MiscPayload:
			return miscReducer(state, payload);

		default:
			return oldReducer(state, action);
	}
};

export default reducer;
