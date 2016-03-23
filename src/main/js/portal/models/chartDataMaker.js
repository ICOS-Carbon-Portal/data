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

export function makeChartData(binTable, tableFormat){
	const [xIdx, yIdx] = axisColumnIndices(tableFormat);

	const data = {
		labels: getLabels(binTable),
		datasets: [{
			label: "My First dataset",
			fillColor: "rgba(220,220,220,0.2)",
			strokeColor: "rgba(20,20,20,1)",
			pointColor: "rgba(220,220,220,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(220,220,220,1)",
			data: getdata(binTable)
		}]
	}

	return {
		lineData: data,
		yAxisLabel: tableFormat.columns(yIdx).name.unit
	};
}

function getLabels(binTable){
	const threshHold = Math.ceil(binTable.length / 20);

	return Array.from({length: binTable.length}, (_, i) => {
		if (i % threshHold == 0) {
			return new Date(binTable.value(i, 0)).toISOString();
		} else {
			return "";
		}
	});
}

function getdata(binTable){
	let val = 0;

	return Array.from({length: binTable.length}, (_, i) => {
		const testVal = binTable.value(i, 1);

		if (testVal){
			val = testVal;
		}

		return val;
	});
}

