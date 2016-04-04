import {getMetaForObjectSpecies, getDataObjectData} from './backend';
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

function gotMeta(meta){
	return {
		type: FETCHED_META,
		meta
	};
}

function gotData(data, dataObjIdx){
	return Object.assign({
		type: FETCHED_DATA,
		dataObjIdx
	}, data);
}

export const fetchMetaData = dataObjSpec => dispatch => {
	dispatch({type: FETCHING_META});

	getMetaForObjectSpecies(dataObjSpec).then(
		meta => dispatch(gotMeta(meta)),
		err => dispatch(failWithError(err))
	);
}

const fetchData = dataObjIdx => (dispatch, getState) => {
	const meta = getState().wdcgg.meta;

	const dataObjInfo = meta.dataObjects[dataObjIdx];
	const request = makeTableRequest(meta.tableFormat, dataObjInfo);

	dispatch({type: FETCHING_DATA});

	getDataObjectData(dataObjInfo.id, request).then(
		data => dispatch(gotData(data, dataObjIdx)),
		err => dispatch(failWithError(err))
	);
}

export const chooseDataObject = dataObjIdx => dispatch => {
	dispatch({
		type: DATA_CHOSEN,
		dataObjIdx
	});

	dispatch(fetchData(dataObjIdx));
}

