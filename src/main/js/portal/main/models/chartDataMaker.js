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

export function binTables2Dygraph(binTables, debug = false){
	let idxs = new Array(binTables.length).fill(0);
	const maxLength = binTables.map(bt => bt.length).sort().pop();
	let data = [];

	// Loop through all rows in all binTables going to the largest index of them all
	for (let dataIdx=0; dataIdx<maxLength; dataIdx++){
		let smallest = Number.MAX_VALUE;
		let includeBTIdxs = [];

		// For each binTable
		for (let bTIdx=0; bTIdx<binTables.length; bTIdx++){

			debug ? console.log({rowIdx: idxs[bTIdx], date: new Date(binTables[bTIdx].value(idxs[bTIdx], 0)).toISOString(), isNotNumber: isNaN(binTables[bTIdx].value(idxs[bTIdx], 0))}) : null;

			// Do not exceed length of binTable and skip entries that cannot be parsed to a number
			if (idxs[bTIdx] < binTables[bTIdx].length && isNaN(binTables[bTIdx].value(idxs[bTIdx], 0))){
				idxs[bTIdx]++;
			} else if (idxs[bTIdx] < binTables[bTIdx].length) {

				debug ? console.log({dataIdx, i1: idxs[0], i2: idxs[1], smallest, value: binTables[bTIdx].value(idxs[bTIdx], 0)}) : null;

				// Check if date in current binTable is the smallest
				if (binTables[bTIdx].value(idxs[bTIdx], 0) <= smallest) {
					// debug ? console.log({pushValue: binTables[bTIdx].value(dataIdx, 0)}) : null;
					includeBTIdxs.push(bTIdx);
					smallest = binTables[bTIdx].value(idxs[bTIdx], 0);
				}
			}
		}

		let dataPoint = [new Date(binTables[includeBTIdxs[0]].value(idxs[includeBTIdxs[0]], 0))];

		debug ? console.log({dataIdx, includeBTIdxs}) : null;

		for (let i = 0; i < binTables.length; i++) {
			if (includeBTIdxs.indexOf(i) > -1){
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