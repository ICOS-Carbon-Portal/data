import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import rootReducer from './reducers'
import {fetchTable} from './actions'

import BinTable from './models/BinTable'

const initialState = {
	xAxis: null,
	yAxis: null,
	binTable: BinTable.empty,
	status: 'INIT',
	error: null
};

export default function(){
	const store = createStore(
		rootReducer,
		initialState,
		applyMiddleware(thunkMiddleware)
	);

	store.dispatch(fetchTable);

	return store;
}

