import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import { fetchDownloadStats, fetchFilters } from './actions';
import StatsTable from './models/StatsTable';

const initState = {
	downloadStats: new StatsTable({}),
	paging: {
		offset: 0,
		to: 0,
		objCount: 0,
		pagesize: 100
	}
};

export default function() {
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));
	store.dispatch(fetchDownloadStats);
	store.dispatch(fetchFilters);
	return store;
}
