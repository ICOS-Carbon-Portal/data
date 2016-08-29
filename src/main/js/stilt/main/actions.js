import {tableFormatForSpecies, getStationInfo, getBinaryTable} from './backend';
import {makeTableRequest} from './models/chartDataMaker';
import config from './config';

export const FETCHED_TABLEFORMAT = 'FETCHED_TABLEFORMAT';
export const FETCHED_STATIONS = 'FETCHED_STATIONS';
export const FETCHED_OBSERVATIONS = 'FETCHED_OBSERVATIONS';
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

export const fetchTableFormat = (dataObjSpec) => dispatch => {
	tableFormatForSpecies(dataObjSpec).then(
		tableFormat => dispatch(gotTableFormat(tableFormat)),
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
	const tableFormat = getState().wdcggFormat;
	const request = makeTableRequest(tableFormat, dataObjectInfo);

	getBinaryTable(dataObjectInfo.id, request).then(
		binTable => {
			dispatch({
				type: FETCHED_OBSERVATIONS,
				dataObjId,
				obsBinTable: binTable
			});
			gotObservationData(binTable, dataObjectInfo.id)
		},
		err => dispatch(failWithError(err))
	);
}

