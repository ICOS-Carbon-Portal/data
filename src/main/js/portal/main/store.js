import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import reducer from './reducer'
import {routeUpdated, fetchTableFormat, fetchStationInfo} from './actions'
import config from './config';
import { EmptyFilter } from './models/Filters';
import StationsInfo from './models/StationsInfo';

const initCounts = {};
const initFilters = {};

initFilters[config.fromDateProp] = new EmptyFilter();
initFilters[config.toDateProp] = new EmptyFilter();
initFilters[config.stationProp] = new EmptyFilter();

config.filteringWidgets.forEach(({prop}) => {
	initCounts[prop] = [];
	initFilters[prop] = new EmptyFilter();
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
	propValueCounts: initCounts,
	filters: initFilters,
	stations: new StationsInfo([]),
	spatialMode: {
		allStations: config.initSpatialModeAllStations
	},
	cache: {
		propsAndVals: null
	}
};

//const logger = store => next => action => {
//	console.log('dispatching', action);
//	// Call the next dispatch method in the middleware chain.
//	let returnValue = next(action);
//	console.log('state after dispatch', store.getState());
//	return returnValue;
//}

const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));//, logger));

export default function(){
	store.dispatch(routeUpdated());
	store.dispatch(fetchTableFormat(config.wdcggSpec));
	store.dispatch(fetchStationInfo);
	return store;
}

