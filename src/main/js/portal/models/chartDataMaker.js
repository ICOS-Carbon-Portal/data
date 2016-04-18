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
	let hasNaNDates = false;

	let dataArr = Array.from({length: binTable.length}, (_, i) => {
		if (isNaN(binTable.value(i, 0))) {
			hasNaNDates = true;
		} else {
			return [
				new Date(binTable.value(i, 0)),
				binTable.value(i, 1),
			];
		}
	});

	if(hasNaNDates) {
		for (var i = 0; i < dataArr.length; i++) {
			if (dataArr[i] === undefined) {
				dataArr.splice(i, 1);
				i--;
			}
		}
	}

	return dataArr;
}

export function getLabels(tableFormat, dataObjInfo){
	const axisIndices = axisColumnIndices(tableFormat);
	return axisIndices.map(i => tableFormat.columns(i).label);
}
