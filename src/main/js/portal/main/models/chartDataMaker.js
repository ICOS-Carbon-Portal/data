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
				binTable.value(i, 1)
			]);
		}
	}

	return dataArr;
}

export function binTables2Dygraph(binTables){
	let idxs = new Array(binTables.length).fill(0);
	const maxLength = binTables.map(bt => bt.length).sort().pop();
	let data = [];
	console.log({binTables2Dygraph, maxLength, binTables});

	for (let dataIdx=0; dataIdx<maxLength; dataIdx++){
		let smallest = Number.MAX_VALUE;
		let includeBTIdxs = [];

		for (let bTIdx=0; bTIdx<binTables.length; bTIdx++){

			if (dataIdx < binTables[bTIdx].length && !isNaN(binTables[bTIdx].value(dataIdx, 0))) {

				if (binTables[bTIdx].value(dataIdx, 0) <= smallest) {
					includeBTIdxs.push(bTIdx);
					smallest = binTables[bTIdx].value(dataIdx, 0);
				}
			}
		}

		let dataPoint = [new Date(binTables[includeBTIdxs[0]].value(idxs[includeBTIdxs[0]], 0))];

		for (let i = 0; i < binTables.length; i++) {
			if (includeBTIdxs.includes(i)){
				dataPoint.push(binTables[i].value(idxs[i], 1));
				idxs[i]++;
			} else {
				dataPoint.push(null);
			}
		}

		data.push(dataPoint);
	}

	return data;
}

export function getLabels(tableFormat){
	const axisIndices = axisColumnIndices(tableFormat);
	return axisIndices.map(i => tableFormat.columns(i).label);
}

function getUniqueLabels(dataObjId){
	return ["time instant", dataObjId];
}

export function addDataObject(chart, dataObjId, binTable, tableFormat){
	console.log({chart, dataObjId, binTable, tableFormat});
	const binTables = chart.binTables.concat(binTable);

	return (chart.dataObjectIds.includes(dataObjId))
		? chart
		: {
			dataObjectIds: chart.dataObjectIds.concat(dataObjId),
			binTables: binTables,
			data: binTables2Dygraph(binTables),
			labels: Array.from(new Set(chart.labels.concat(getUniqueLabels(dataObjId))))
		};
}