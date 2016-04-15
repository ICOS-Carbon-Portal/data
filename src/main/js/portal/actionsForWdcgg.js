import {tableFormatForSpecies, getDataObjectData} from './backend';
import {makeTableRequest} from './models/chartDataMaker';

export const FETCHING_META = 'FETCHING_META';
export const FETCHING_DATA = 'FETCHING_DATA';
export const FETCHED_META = 'FETCHED_META';
export const FETCHED_DATA = 'FETCHED_DATA';
export const DATA_CHOSEN = 'DATA_CHOSEN';
export const ERROR = 'ERROR';

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

// export const fetchMetaData = (dataObjSpec, dataObjectId) => dispatch => {
// 	dispatch({type: FETCHING_META});
//
// 	getMetaForObjectSpecies(dataObjSpec, dataObjectId).then(
// 		meta => dispatch(gotMeta(meta)),
// 		err => dispatch(failWithError(err))
// 	);
// }

export const fetchTableFormat = (dataObjSpec) => dispatch => {
	dispatch({type: FETCHING_META});

	tableFormatForSpecies(dataObjSpec).then(
		tableFormat => dispatch(gotMeta(tableFormat)),
		err => dispatch(failWithError(err))
	);
}

const fetchData = dataObjectInfo => (dispatch, getState) => {
	const tableFormat = getState().wdcgg.tableFormat;
	const request = makeTableRequest(tableFormat, dataObjectInfo);

	dispatch({type: FETCHING_DATA});

	getDataObjectData(dataObjectInfo.id, request).then(
		data => dispatch(gotData(data, dataObjectInfo.id)),
		err => dispatch(failWithError(err))
	);
}

export const chooseDataObject = dataObjectInfo => dispatch => {
	dispatch({
		type: DATA_CHOSEN,
		dataObjectId: dataObjectInfo.id
	});

	dispatch(fetchData(dataObjectInfo));
}

