import { createStore, applyMiddleware, compose, Dispatch, Action, Middleware, AnyAction } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import { State } from './models/State';
import { init } from "./actions";
import { ActionPayload, NetCDFPlainAction } from './actionDefinitions';


export interface NetCDFThunkAction<R> {
	(dispatch: NetCDFDispatch, getState: () => State): R
}

export interface NetCDFDispatch extends Dispatch<Action<string>> {
	<R>(asyncAction: NetCDFThunkAction<R>): R
	(payload: ActionPayload): NetCDFPlainAction
}

function createPlainAction(payload: ActionPayload): NetCDFPlainAction {
	return {
		type: payload.constructor.name,
		payload
	};
}

const payloadMiddleware: Middleware<NetCDFDispatch, State, NetCDFDispatch> = store => next => action => {
	const finalAction: AnyAction = (action instanceof ActionPayload)
		? createPlainAction(action)
		: action;
	return next(finalAction);
};

const opts = window.location.hostname.startsWith('local-')
	? { trace: true }
	: {};
const REDUX_DEVTOOLS_EXTENSION_COMPOSE = (window as any)['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'];
const composeEnhancers = REDUX_DEVTOOLS_EXTENSION_COMPOSE
	? REDUX_DEVTOOLS_EXTENSION_COMPOSE(opts)
	: compose;

const enhancer = composeEnhancers(
	applyMiddleware(payloadMiddleware, thunkMiddleware)
);

export default function(){
	const store = createStore(reducer, undefined, enhancer);
	init(store.dispatch);

	return store;
}
