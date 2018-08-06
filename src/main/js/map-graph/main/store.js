import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {failWithError, init} from './actions';


const objId = window.location.search
	? window.location.search.split('=')[1]
	: undefined;

export const getHash = () => {
	const hash = window.location.hash.substr(1);
	let hashState;

	try {
		hashState = JSON.parse(decodeURIComponent(hash));
	} catch(err) {
		hashState = {};
	}

	return hashState;
};

export default function() {
	const store = createStore(reducer, undefined, applyMiddleware(thunkMiddleware));

	if (objId) {
		store.dispatch(init(objId, getHash()));
	} else {
		store.dispatch(failWithError({message: 'You must supply an object id'}));
	}

	return store;
}
