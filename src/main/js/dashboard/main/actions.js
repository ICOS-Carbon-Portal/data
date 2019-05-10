import {fetchStationMeasurement} from './backend';
export const ERROR = 'ERROR';
export const INIT = 'INIT';
export const STATION_MEASUREMENTS = 'STATION_MEASUREMENTS';


export const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};


export const init = () => dispatch => {
	dispatch({type: INIT});
};

const getStationMeasurement = (stationId, valueType) => dispatch => {
	fetchStationMeasurement(stationId, valueType).then(measurements => {
		dispatch({
			type: STATION_MEASUREMENTS,
			measurements
		});
	});
};
