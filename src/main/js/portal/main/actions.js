import {tableFormatForSpecies, getStationPositions, getDataObjectData, getGlobalTimeInterval, getFilteredPropValueCounts} from './backend';
import {makeTableRequest} from './models/chartDataMaker';

export const FETCHING_META = 'FETCHING_META';
export const FETCHING_SPATIAL = 'FETCHING_SPATIAL';
export const FETCHING_DATA = 'FETCHING_DATA';
export const FETCHED_META = 'FETCHED_META';
export const FETCHED_SPATIAL = 'FETCHED_SPATIAL';
export const FETCHED_DATA = 'FETCHED_DATA';
export const DATA_CHOSEN = 'DATA_CHOSEN';
export const REMOVE_DATA = 'REMOVE_DATA';
export const REMOVED_DATA = 'REMOVED_DATA';
export const PIN_DATA = 'PIN_DATA';
export const ERROR = 'ERROR';
export const FROM_DATE_SET = 'FROM_DATE_SET';
export const TO_DATE_SET = 'TO_DATE_SET';
export const GOT_GLOBAL_TIME_INTERVAL = 'GOT_GLOBAL_TIME_INTERVAL';
export const FILTER_UPDATED = 'FILTER_UPDATED';
export const GOT_PROP_VAL_COUNTS = 'GOT_PROP_VAL_COUNTS';
export const ROUTE_UPDATED = 'ROUTE_UPDATED';
export const SPATIAL_EXTENT_DEFINED = 'SPATIAL_EXTENT_DEFINED';


export const routeUpdated = (route) => (dispatch, getState) => {
	const state = getState();
	const actualRoute = state.filteredDataObjects ? route : "search";
	dispatch({
		type: ROUTE_UPDATED,
		route: actualRoute || window.location.hash.substr(1) || "search"
	});
}

function failWithError(error){
	return {
		type: ERROR,
		error
	};
}

function gotMeta(tableFormat){
	return {
		type: FETCHED_META,
		tableFormat
	};
}

function gotData(data, dataObjId){
	return Object.assign({
		type: FETCHED_DATA,
		dataObjId
	}, data);
}

export const fetchTableFormat = (dataObjSpec) => dispatch => {
	dispatch({type: FETCHING_META});

	tableFormatForSpecies(dataObjSpec).then(
		tableFormat => dispatch(gotMeta(tableFormat)),
		err => dispatch(failWithError(err))
	);
}

export const fetchStationPositions = () => dispatch => {
	dispatch({type: FETCHING_SPATIAL});

	getStationPositions().then(
		stationPositions => dispatch({
			type: FETCHED_SPATIAL,
			stationPositions
		}),
		err => dispatch(failWithError(err))
	);
}

const fetchData = dataObjectInfo => (dispatch, getState) => {
	const tableFormat = getState().tableFormat;
	const request = makeTableRequest(tableFormat, dataObjectInfo);

	dispatch({type: FETCHING_DATA});

	getDataObjectData(dataObjectInfo.id, request).then(
		data => dispatch(gotData(data, dataObjectInfo.id)),
		err => dispatch(failWithError(err))
	);
}

export const pinDataObject = dataObjectInfo => dispatch => {
	dispatch({
		type: PIN_DATA,
		dataObjectInfo: dataObjectInfo
	});
}

export const addDataObject = (dataObjectInfo, useCache) => dispatch => {
	if (useCache){
		dispatch({
			type: DATA_CHOSEN,
			dataObjId: dataObjectInfo.id
		});

		dispatch({
			type: FETCHED_DATA,
			dataObjId: dataObjectInfo.id
		});
	} else {
		dispatch({
			type: DATA_CHOSEN,
			dataObjId: dataObjectInfo.id
		});

		dispatch(fetchData(dataObjectInfo));
	}
}

export const removeDataObject = dataObjectInfo => dispatch => {
	dispatch({
		type: REMOVE_DATA,
		dataObjId: dataObjectInfo.id
	});
}

export const fromDateSet = (date) => dispatch => {
	dispatch({
		type: FROM_DATE_SET,
		date
	});
	dispatch(fetchPropValueCounts);
}

export const toDateSet = (date) => dispatch => {
	dispatch({
		type: TO_DATE_SET,
		date
	});
	dispatch(fetchPropValueCounts);
}

export const spatialExtentDefined = (filteredStations) => dispatch => {
	dispatch({
		type: SPATIAL_EXTENT_DEFINED,
		filteredStations
	});
	dispatch(fetchPropValueCounts);
}

export function fetchGlobalTimeInterval(dispatch, getState){
	const objSpec = getState().objectSpecification;

	getGlobalTimeInterval(objSpec).then(
		interval => {
			dispatch(gotGlobalTimeInterval(objSpec, interval));
			dispatch(fetchPropValueCounts);
		},
		err => dispatch(gotError(err))
	);
}

function gotError(error){
	console.log({error});
	return {
		type: ERROR,
		error
	};
}

function gotGlobalTimeInterval(objectSpecification, interval){
	return Object.assign(
		{
			type: GOT_GLOBAL_TIME_INTERVAL,
			objectSpecification
		},
		interval
	);
}

export const updateFilter = (filterId, filter) => dispatch => {
	dispatch({
		type: FILTER_UPDATED,
		update: {[filterId]: filter}
	});

	dispatch(fetchPropValueCounts);
};

function fetchPropValueCounts(dispatch, getState){
	const {objectSpecification, filters, fromDate, toDate, spatial} = getState();

	getFilteredPropValueCounts(objectSpecification, filters, fromDate, toDate, spatial).then(
		propsAndVals => dispatch({
			type: GOT_PROP_VAL_COUNTS,
			propsAndVals,
			objectSpecification,
			fromDate,
			toDate
		}),
		err => dispatch(gotError(err))
	);
}

