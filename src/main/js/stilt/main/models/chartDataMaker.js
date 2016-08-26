const xColumn = 'TIMESTAMP';
const yColumn = 'PARAMETER';

function axisColumnIndices(tableFormat){
	return [xColumn, yColumn].map(idx => tableFormat.getColumnIndex(idx));
}

export function makeTableRequest(tableFormat, dataObjectInfo){
	const axisIndices = axisColumnIndices(tableFormat);

	return tableFormat.getRequest(dataObjectInfo.id, dataObjectInfo.nRows, axisIndices);
}

