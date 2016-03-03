import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import rootReducer from './reducers'
import {fetchMetaData, chooseTable} from './actions'

const initialState = {
	tables: null,
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

	store.dispatch(fetchMetaData({}));

	return store;
}

