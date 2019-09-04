import 'babel-polyfill';
import {createStore, applyMiddleware, Middleware, AnyAction, Action, Dispatch, compose} from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducers/mainReducer';
import {ActionPayload, init, IPortalPlainAction} from './actions';
import State from "./models/State";


// const logger = store => next => action => {
// 	console.log('dispatching', action);
// 	// Call the next dispatch method in the middleware chain.
// 	let returnValue = next(action);
// 	console.log('state after dispatch', store.getState());
// 	return returnValue;
// };
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
const composeEnhancers = (window as any)['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'](opts) as typeof compose || compose;

const enhancer = composeEnhancers(
	applyMiddleware(payloadMiddleware, thunkMiddleware)	//, logger)
);

export default function(){
	const store = createStore(
		reducer,
		undefined,
		enhancer
	);
	store.dispatch(init);
	return store;
}

function createAction(payload: ActionPayload): IPortalPlainAction {
	return {
		type: payload.constructor.name,
		payload
	};
}
