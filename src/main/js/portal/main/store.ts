import 'babel-polyfill';
import {createStore, applyMiddleware, Middleware, AnyAction, Action, Dispatch, compose} from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducers/mainReducer';
import {ActionPayload, init, IPortalPlainAction} from './actions';
import stateUtils, {State} from "./models/State";


const selectSubState = (state: any) => {
	// What part of state we want to log
	return {metadata: state.metadata};
};
const logStoreChange = (currentState: any, nextState: any, select: Function) => {
	const historyState = history.state ? select(history.state) : undefined;
	console.log({currentState, nextState, historyState, historyLength: history.state ? history.length : 0});
};

export interface IPortalThunkAction<R>{
	(dispatch: PortalDispatch, getState: () => State): R
}

//TODO When the old reducer is not used any more, change Dispatch's type param to IPortalPlainAction
export interface PortalDispatch extends Dispatch<Action<string>>{
	<R>(asyncAction: IPortalThunkAction<R>): R
	(payload: ActionPayload): IPortalPlainAction
}

const payloadMiddleware: Middleware<PortalDispatch, State, PortalDispatch> = store => next => action => {
	const finalAction: AnyAction = (action instanceof ActionPayload)
		? createAction(action)
		: action;
	return next(finalAction);
};

const opts = window.location.hostname.startsWith('local-')
	? {trace: true}
	: {};
const composeEnhancers = (window as any)['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__']
	? (window as any)['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'](opts) as typeof compose
	: compose;

const enhancer = composeEnhancers(
	applyMiddleware(payloadMiddleware, thunkMiddleware)
);

export default function(){
	const store = createStore(
		reducer,
		undefined,
		enhancer
	);
	store.dispatch(init);

	// Use storeOverwatch to log changes in store (see selectSubState and logStoreChange above)
	// stateUtils.storeOverwatch(store, selectSubState, logStoreChange);

	return store;
}

function createAction(payload: ActionPayload): IPortalPlainAction {
	return {
		type: payload.constructor.name,
		payload
	};
}
