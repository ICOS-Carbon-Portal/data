import {fetchStationMeasurement, fetchObjectSpecifications, fetchBinTable} from './backend';
export const actionTypes = {
	ERROR: 'ERROR',
	DISPLAY_ERROR: 'DISPLAY_ERROR',
	INIT: 'INIT',
	STATION_MEASUREMENTS: 'STATION_MEASUREMENTS',
	BINTABLE: 'BINTABLE',
	SWITCH_TIMEPERIOD: 'SWITCH_TIMEPERIOD'
};


export const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: actionTypes.ERROR,
		error
	});
};

export const displayError = dispatch => error => {
	dispatch({
		type: actionTypes.DISPLAY_ERROR,
		error
	});
};

export const init = searchParams => dispatch => {
	const isValidRequest = searchParams.has('stationId') && searchParams.has('valueType') && searchParams.has('height');
	const stationId = searchParams.get('stationId');
	const valueType = searchParams.get('valueType');
	const height = searchParams.get('height');

	dispatch({
		type: actionTypes.INIT,
		stationId,
		valueType,
		height
	});

	if (isValidRequest){
		dispatch(getStationMeasurement(stationId, valueType, 1, height));
		dispatch(getStationMeasurement(stationId, valueType, 2, height));
	}
};

const getStationMeasurement = (stationId, valueType, dataLevel, height) => dispatch => {

	fetchStationMeasurement(stationId, valueType, dataLevel, height).then(measurements => {
		dispatch({
			type: actionTypes.STATION_MEASUREMENTS,
			measurements
		});

		dispatch(getObjectSpecifications(measurements, dataLevel, valueType));
	});
};

const getObjectSpecifications = (measurements, dataLevel, valueType) => dispatch => {
	const objIds = measurements.map(m => m.dobj);

	fetchObjectSpecifications(objIds).then(objectSpecifications => {
		if (objectSpecifications === undefined) {
			dispatch({
				type: actionTypes.BINTABLE,
				dataLevel,
				objSpec: undefined,
				binTable: undefined
			});
		} else {
			objectSpecifications.forEach(objSpec => {
				dispatch(getBinTable(dataLevel, valueType, objSpec));
			})
		}
	},
		displayError(dispatch)
	);
};

const getBinTable = (dataLevel, yCol, objSpec) => dispatch => {
	const {id, tableFormat, nRows} = objSpec;

	fetchBinTable(yCol, id, tableFormat, nRows).then(binTable => {
		dispatch({
			type: actionTypes.BINTABLE,
			dataLevel,
			objSpec,
			binTable
		});
	});
};

export const switchTimePeriod = timePeriod => dispatch => {
	dispatch({
		type: actionTypes.SWITCH_TIMEPERIOD,
		timePeriod
	})
};
