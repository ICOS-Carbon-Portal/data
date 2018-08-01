export const ERROR = 'ERROR';
export const BINTABLE_FETCHED = 'BINTABLE_FETCHED';
export const VARIABLE_SELECTED = 'VARIABLE_SELECTED';
import config from '../../common/main/config';
import {getTableFormatNrows, getBinTable} from './backend';
import BinTableData from './models/BinTableData';


export const failWithError = error => dispatch => {
	console.log({error, dispatch});
	dispatch({
		type: ERROR,
		error
	});
};

export const fetchTableFormatNrows = objId => dispatch => {
	getTableFormatNrows(config, objId)
		.then(({tableFormat, nRows}) => {
			const binTableData = new BinTableData(tableFormat);

			if (binTableData.isValidData) {
				getBinTable(objId, tableFormat, nRows)
					.then(binTable => {
						dispatch({
							type: BINTABLE_FETCHED,
							binTableData: binTableData.withBinTable(binTable)
						});
					});
			} else {
				dispatch(failWithError({message: `Data object ${objId} cannot be displayed due to missing data`}));
			}
	});
};

export const selectVar = (axel, dataIdx) => (dispatch, getState) => {
	const {binTableData, selectOptions} = getState();
	const valueIdx = binTableData.dataIdx2ValueIdx(dataIdx);

	dispatch({
		type: VARIABLE_SELECTED,
		axel,
		valueIdx
	})
};
