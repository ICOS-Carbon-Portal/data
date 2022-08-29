import {createStore, applyMiddleware, Middleware, AnyAction, Dispatch, compose} from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducers/mainReducer';
import {init} from './actions/main';
import stateUtils, {State} from "./models/State";
import {ActionPayload, PortalPlainAction} from "./reducers/actionpayloads";


const logStoreChange = (currentState: Partial<State>, nextState: Partial<State>, changes: Partial<State>, select: (state: State) => Partial<State>) => {
	const historyState = history.state ? select(history.state) : undefined;
	console.log({ currentState, nextState, changes, historyState, historyLength: history.state ? history.length : 0});
};

export interface PortalThunkAction<R>{
	(dispatch: PortalDispatch, getState: () => State): R
}

export interface PortalDispatch extends Dispatch<PortalPlainAction>{
	<R>(asyncAction: PortalThunkAction<R>): R
	(payload: ActionPayload): PortalPlainAction
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
const REDUX_DEVTOOLS_EXTENSION_COMPOSE = (window as any)['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'];
const composeEnhancers = REDUX_DEVTOOLS_EXTENSION_COMPOSE
	? REDUX_DEVTOOLS_EXTENSION_COMPOSE(opts) as typeof compose
	: compose;

const enhancer = composeEnhancers(
	applyMiddleware(payloadMiddleware, thunkMiddleware)
);

export default function(){
	const store = createStore(
		reducer,
		stateUtils.getStateFromHash(),
		enhancer
	);
	store.dispatch(init);

	// Use storeOverwatch to log changes in store
	// stateUtils.storeOverwatch(store, ['specTable', 'paging'], logStoreChange);

	return store;
}

function createAction(payload: ActionPayload): PortalPlainAction {
	return {
		type: payload.constructor.name,
		payload
	};
}