import {tableFormatForSpecies} from '../../common/main/backend/tableFormat';
import {getStationInfo, getWdcggBinaryTable} from './backend';
import config from './config';

export const FETCHED_TABLEFORMAT = 'FETCHED_TABLEFORMAT';
export const FETCHED_STATIONS = 'FETCHED_STATIONS';
export const FETCHED_OBSERVATIONS = 'FETCHED_OBSERVATIONS';
export const SET_SELECTED_STATION = 'SET_SELECTED_STATION';
export const SET_SELECTED_YEAR = 'SET_SELECTED_YEAR';
export const ERROR = 'ERROR';


function failWithError(error){
	console.log(error);
	return {
		type: ERROR,
		error
	};
}

function gotTableFormat(wdcggFormat){
	return {
		type: FETCHED_TABLEFORMAT,
		wdcggFormat
	};
}

function gotObservationData(binTable, dataObjId){
	return {
		type: FETCHED_OBSERVATIONS,
		dataObjId,
		obsBinTable: binTable
	};
}

export const fetchTableFormat = dispatch => {
	tableFormatForSpecies(config.wdcggSpec).then(
		tableFormat => {
			dispatch(gotTableFormat(tableFormat));
			//TODO Remove the next line, prototyping-only
			//dispatch(fetchObservationData({id: 'https://meta.icos-cp.eu/objects/CKuB_hK4-1g3PB1lyPjrZMM3', nRows: 8760}));
		},
		err => dispatch(failWithError(err))
	);
}

export const fetchStationInfo = dispatch => {
	getStationInfo().then(
		stationInfo => dispatch({
			type: FETCHED_STATIONS,
			stationInfo
		}),
		err => dispatch(failWithError(err))
	);
}

export const fetchObservationData = dataObjectInfo => (dispatch, getState) => {
	//dataObjectInfo: {id: String, nRows: Int}
	const tableFormat = getState().wdcggFormat;

	getWdcggBinaryTable(tableFormat, dataObjectInfo).then(
		binTable => dispatch(gotObservationData(binTable, dataObjectInfo.uri)),
		err => dispatch(failWithError(err))
	);
}

export const setSelectedStation = station => dispatch => {
	dispatch({
		type: SET_SELECTED_STATION,
		selectedStation: station
	});
}

export const setSelectedYear = selectedYear => dispatch => {
	dispatch({
		type: SET_SELECTED_YEAR,
		selectedYear
	});
}

