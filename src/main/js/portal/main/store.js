import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {getAllSpecTables, fetchCart} from './actions';
import CompositeSpecTable from './models/CompositeSpecTable';
import Cart from './models/Cart';


const initState = {
	event: undefined,
	metadata: undefined,
	specTable: new CompositeSpecTable({}),
	objectsTable: [],
	sorting: {objCount: 0},
	paging: {},
	cart: new Cart(),
	cache: {
		dobjColumns: []
	}
};

// function logger({ getState }) {
// 	return (next) => (action) => {
// 		console.log('will dispatch', action)
//
// 		// Call the next dispatch method in the middleware chain.
// 		let returnValue = next(action)
//
// 		console.log('state after dispatch', getState())
//
// 		// This will likely be the action itself, unless
// 		// a middleware further in chain changed it.
// 		return returnValue
// 	}
// }

export default function(){
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));
	store.dispatch(fetchCart);
	store.dispatch(getAllSpecTables);
	return store;
}
