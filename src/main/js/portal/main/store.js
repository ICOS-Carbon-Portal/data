import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {init} from './actions';


// const logger = store => next => action => {
// 	console.log('dispatching', action);
// 	// Call the next dispatch method in the middleware chain.
// 	let returnValue = next(action);
// 	console.log('state after dispatch', store.getState());
// 	return returnValue;
// };

export default function(){
	const store = createStore(reducer, undefined, applyMiddleware(thunkMiddleware));	//, logger));
	store.dispatch(init());

	return store;
}
