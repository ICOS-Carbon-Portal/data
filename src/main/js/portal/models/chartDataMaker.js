import {lastUrlPart} from './TableFormat';

const xColumn = 'TIMESTAMP';
const yColumn = 'PARAMETER';

function axisColumnIndices(tableFormat){
	return [xColumn, yColumn].map(idx => tableFormat.getColumnIndex(idx));
}

export function makeTableRequest(tableFormat, dataObjInfo){
	const axisIndices = axisColumnIndices(tableFormat);
	const tableId = lastUrlPart(dataObjInfo.id);

	return tableFormat.getRequest(tableId, dataObjInfo.nRows, axisIndices);
}

export function binTable2Dygraph(binTable){
	return Array.from({length: binTable.length}, (_, i) => {
		return [
			new Date(binTable.value(i, 0)),
			binTable.value(i, 1),
		];
	});
}

export function getLabels(tableFormat, dataObjInfo){
	const axisIndices = axisColumnIndices(tableFormat);
	return axisIndices.map(i => tableFormat.columns(i).label);
}
