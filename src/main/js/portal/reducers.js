import { FETCHING_STARTED, ERROR, FETCHED_META, FETCHED_TABLE, TABLE_CHOSEN, YAXIS_CHOSEN } from './actions'

function getLabels(binTable, xAxisColumn){
	const threshHold = Math.ceil(binTable.length / 20);

	return Array.from({length: binTable.length}, (_, i) => {
		if (i % threshHold == 0) {
			return new Date(binTable.value(i, xAxisColumn)).toISOString();
		} else {
			return "";
		}
	});
}

function getdata(binTable, yAxisColumn){
	let val = 0;

	return Array.from({length: binTable.length}, (_, i) => {
		const testVal = binTable.value(i, yAxisColumn);

		if (testVal){
			val = testVal;
		}

		return val;
	});
}

export default function(state, action){

	switch(action.type){

		case FETCHING_STARTED:
			return Object.assign({}, state, {status: 'FETCHING'});

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		case FETCHED_META:
			return Object.assign({}, state, {
				status: 'FETCHED',
				tables: action.tables
			});

		case FETCHED_TABLE:
			return (state.chosenTable === action.tableIndex)
				? Object.assign({}, state, {
					status: 'FETCHED',
					xAxisColumn: state.tables[state.chosenTable].columnNames.indexOf("TIMESTAMP"),
					binTable: action.table
				})
				: state; //ignore the fetched table if another one got chosen while fetching

		case TABLE_CHOSEN:
			return Object.assign({}, state, {chosenTable: action.tableIndex});

		case YAXIS_CHOSEN:
			if(state.chosenTable >= 0 && state.xAxisColumn >= 0){
				const lineData = [{
					name: state.tables[state.chosenTable].columnNames[action.yAxisColumn],
					values: state.binTable.chartValues(state.xAxisColumn, action.yAxisColumn)
				}];
				console.log({"state.tables": state.tables});

				const data = {
					labels: getLabels(state.binTable, state.xAxisColumn),
					datasets: [{
						label: "My First dataset",
						fillColor: "rgba(220,220,220,0.2)",
						strokeColor: "rgba(20,20,20,1)",
						pointColor: "rgba(220,220,220,1)",
						pointStrokeColor: "#fff",
						pointHighlightFill: "#fff",
						pointHighlightStroke: "rgba(220,220,220,1)",
						data: getdata(state.binTable, action.yAxisColumn)
					}]
				}

				const yAxisLabel = state.tables[state.chosenTable].columnUnits[action.yAxisColumn];
				console.log({"data": data});

				return Object.assign({}, state, {
					chartData: {
						lineData: data,
						yAxisLabel: yAxisLabel
					},
					yAxisColumn: action.yAxisColumn
				});
			}
			else return Object.assign({}, state, {yAxisColumn: action.yAxisColumn});

		default:
			return state;
	}

}

