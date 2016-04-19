const xColumn = 'TIMESTAMP';
const yColumn = 'PARAMETER';

function axisColumnIndices(tableFormat){
	return [xColumn, yColumn].map(idx => tableFormat.getColumnIndex(idx));
}

export function makeTableRequest(tableFormat, dataObjectInfo){
	const axisIndices = axisColumnIndices(tableFormat);

	return tableFormat.getRequest(dataObjectInfo.id, dataObjectInfo.nRows, axisIndices);
}

export function binTable2Dygraph(binTable){
	let dataArr = [];

	for (let i=0; i<binTable.length; i++){
		if (!isNaN(binTable.value(i, 0))) {
			dataArr.push([
				new Date(binTable.value(i, 0)),
				binTable.value(i, 1),
			]);
		}
	}

	return dataArr;
}

export function getLabels(tableFormat, dataObjInfo){
	const axisIndices = axisColumnIndices(tableFormat);
	return axisIndices.map(i => tableFormat.columns(i).label);
}
