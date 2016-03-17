import { FETCHING_STARTED, ERROR, FETCHED_META, FETCHED_TABLE, TABLE_CHOSEN, YAXIS_CHOSEN } from './actions'

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
					xAxisColumn: 0,
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

				const yAxisLabel = state.tables[state.chosenTable].columnUnits[action.yAxisColumn];

				return Object.assign({}, state, {
					chartData: {
						lineData: lineData,
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

