import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import { fetchDownloadCounts, fetchFilters } from './actions';

const initState = {};

export default function() {
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));
	store.dispatch(fetchDownloadCounts);
	store.dispatch(fetchFilters);
	return store;
}
