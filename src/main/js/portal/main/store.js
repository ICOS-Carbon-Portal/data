import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {fetchUserInfo, getAllSpecTables} from './actions';
import CompositeSpecTable from './models/CompositeSpecTable';
import Cart from './models/Cart';
import Preview from './models/Preview';


const initState = {
	user: {},
	lookup: undefined,
	specTable: new CompositeSpecTable({}),
	objectsTable: [],
	sorting: {objCount: 0},
	paging: {},
	cart: new Cart(),
	preview: new Preview(),
	toasterData: undefined,
	batchDownloadStatus: {
		isAllowed: false,
		ts: 0
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
	store.dispatch(fetchUserInfo(true));
	store.dispatch(getAllSpecTables);
	return store;
}
