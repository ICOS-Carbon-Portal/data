import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import rootReducer from './reducers'
import {chooseTable} from './actions'

const tables = [{
	columnNames: ['RECORD', 'SWC1_IRR_Avg', 'Rnet_NCOR_Avg'],
	columnUnits: ['Time', 'mV', 'ppm'],
	request: {
		"tableId": "aaaaaaaaaaaaaaaaaaaaaa01",
		"schema": {
			"columns": ["INT", "FLOAT", "DOUBLE"],
			"size": 344
		},
		"columnNumbers": [0, 1, 2]
	}
}];

const initialState = {
	tables,
	chosenTable: -1,
	xAxisColumn: -1,
	yAxisColumn: -1,
	binTable: null,
	chartData: null,
	status: 'INIT',
	error: null
};

export default function(){
	const store = createStore(
		rootReducer,
		initialState,
		applyMiddleware(thunkMiddleware)
	);

	store.dispatch(chooseTable(0));

	return store;
}

