import {fetchStationMeasurement, fetchObjectSpecifications, fetchBinTable} from './backend';
export const ERROR = 'ERROR';
export const INIT = 'INIT';
export const STATION_MEASUREMENTS = 'STATION_MEASUREMENTS';
export const BINTABLE = 'BINTABLE';


export const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};


export const init = searchParams => dispatch => {
	const isValidRequest = searchParams.has('stationId') && searchParams.has('valueType') && searchParams.has('height');
	const stationId = searchParams.get('stationId');
	const valueType = searchParams.get('valueType');
	const height = searchParams.get('height');

	dispatch({
		type: INIT,
		stationId,
		valueType,
		height
	});

	if (isValidRequest){
		dispatch(getStationMeasurement(stationId, valueType, height));
	}
};

const getStationMeasurement = (stationId, valueType, height) => dispatch => {

	fetchStationMeasurement(stationId, valueType, height).then(measurements => {
		dispatch({
			type: STATION_MEASUREMENTS,
			measurements
		});

		dispatch(getObjectSpecifications(measurements, valueType));
	});
};

const getObjectSpecifications = (measurements, valueType) => dispatch => {
	const objIds = measurements.map(m => m.dobj);

	fetchObjectSpecifications(objIds).then(objectSpecifications => {
		objectSpecifications.forEach(objSpec => {
			dispatch(getBinTable(valueType, objSpec));
		});
	});
};

const getBinTable = (yCol, objSpec) => dispatch => {
	const {id, tableFormat, nRows} = objSpec;

	fetchBinTable(yCol, id, tableFormat, nRows).then(binTable => {
		dispatch({
			type: BINTABLE,
			objSpec,
			binTable,
			yCol,
			nRows
		});
	});
};
