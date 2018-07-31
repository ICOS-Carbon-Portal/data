import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {failWithError, fetchTableFormatNrows} from './actions';


const objId = window.location.search
	? window.location.search.split('=')[1]
	: undefined;

export default function() {
	const store = createStore(reducer, undefined, applyMiddleware(thunkMiddleware));

	if (objId) {
		store.dispatch(fetchTableFormatNrows(objId));
	} else {
		store.dispatch(failWithError({message: 'You must supply an object id'}));
	}

	return store;
}
