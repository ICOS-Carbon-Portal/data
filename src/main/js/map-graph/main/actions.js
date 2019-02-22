import {logError} from "../../common/main/backend";

export const ERROR = 'ERROR';
export const HASH_STATE_UPDATED = 'HASH_STATE_UPDATED';
export const BINTABLE_FETCHED = 'BINTABLE_FETCHED';
export const VARIABLE_Y1_SELECTED = 'VARIABLE_Y1_SELECTED';
export const VARIABLE_Y2_SELECTED = 'VARIABLE_Y2_SELECTED';
export const MAP_STATE_CHANGED = 'MAP_STATE_CHANGED';
import {getTableFormatNrows, getBinTable} from './backend';
import BinTableData from './models/BinTableData';
import commonConfig from '../../common/main/config';
import portalConfig from '../../portal/main/config';

const config = Object.assign(commonConfig, portalConfig);

export const failWithError = error => dispatch => {
	console.log({error, dispatch});

	logError(config.MAPGRAPH, error.message);

	dispatch({
		type: ERROR,
		error
	});
};

const fail = dispatch => error => {
	dispatch(failWithError(error));
};

export const init = (objId, hashState) => dispatch => {
	dispatch(hashUpdated(hashState));
	dispatch(fetchTableFormatNrows(objId));
};

export const hashUpdated = hashState => dispatch => {
	dispatch({
		type: HASH_STATE_UPDATED,
		hashState
	});
};

const fetchTableFormatNrows = objId => dispatch => {
	getTableFormatNrows(config, objId).then(
		({tableFormat, nRows}) => {
			const binTableData = new BinTableData(tableFormat);

			if (binTableData.isValidData) {
				getBinTable(objId, tableFormat, nRows)
					.then(binTable => {
						dispatch({
							type: BINTABLE_FETCHED,
							objId,
							binTableData: binTableData.withBinTable(binTable)
						});
					});
			} else {
				dispatch(failWithError({message: `Data object ${objId} cannot be displayed due to missing data`}));
			}
		},
		fail(dispatch)
	);
};

export const selectVarY1 = dataIdx => (dispatch, getState) => {
	const {binTableData} = getState();
	const value1Idx = binTableData.dataIdx2ValueIdx(dataIdx);

	dispatch({
		type: VARIABLE_Y1_SELECTED,
		value1Idx
	})
};

export const selectVarY2 = dataIdx => (dispatch, getState) => {
	const {binTableData} = getState();
	const value2Idx = binTableData.dataIdx2ValueIdx(dataIdx);

	dispatch({
		type: VARIABLE_Y2_SELECTED,
		value2Idx
	})
};

export const selectVar = valueIdx => (dispatch, getState) => {
	const {binTableData, value1Idx, value2Idx} = getState();

	if (valueIdx === value1Idx) {
		dispatch(selectVarY1(binTableData.valueIdx2DataIdx(valueIdx)));
	} else if (valueIdx === value2Idx){
		dispatch(selectVarY2(binTableData.valueIdx2DataIdx(valueIdx)));
	} else {
		dispatch(failWithError({message: "Could not determine what axel was selected"}));
	}
};

export const mapStateChanged = (center, zoom) => dispatch => {
	dispatch({
		type: MAP_STATE_CHANGED,
		center,
		zoom
	})
};
