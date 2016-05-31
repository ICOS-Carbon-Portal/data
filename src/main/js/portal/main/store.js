import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import reducer from './reducer'
import {routeUpdated, fetchTableFormat, fetchStationPositions} from './actions'
import config from './config';
import { EmptyFilter } from './models/Filters';

const initCounts = {};
const initFilters = {};
config.wdcggProps.forEach(prop => {
	initCounts[prop.uri] = [];
	initFilters[prop.uri] = new EmptyFilter();
});

const initState = {
	dataObjects:[],
	forChart: {
		data: [],
		labels: []
	},
	forMap: {
		geoms: []
	},
	tableFormat: null,
	status: 'INIT',
	error: null,
	objectSpecification: config.wdcggSpec,
	fromDateMin: '1950-01-01T12:00:00Z',
	toDateMax: '2030-12-13T12:00:00Z',
	fromDate: null,
	toDate: null,
	propValueCounts: initCounts,
	filters: initFilters,
	spatial: {
		stations: [],
		forMap: [],
		filtered: []
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

const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));

export default function(){
	store.dispatch(routeUpdated());
	store.dispatch(fetchTableFormat(config.wdcggSpec));
	store.dispatch(fetchStationPositions());
	return store;
}

