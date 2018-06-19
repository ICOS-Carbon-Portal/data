import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import { fetchDownloadStats, fetchCountries, fetchFilters } from './actions';
import StatsTable from './models/StatsTable';
import StatsMap from './models/StatsMap';

const initState = {
	downloadStats: new StatsTable({}),
	statsMap: new StatsMap(),
	paging: {
		offset: 0,
		to: 0,
		objCount: 0,
		pagesize: 100
	}
};

export default function() {
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));
	store.dispatch(fetchDownloadStats({}));
	store.dispatch(fetchFilters);
	store.dispatch(fetchCountries);
	return store;
}
