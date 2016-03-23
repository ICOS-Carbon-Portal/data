import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import rootReducer from './reducers'
import {fetchMetaData} from './actions'

const initialState = {
	meta: null,
	chosenObjectIdx: -1,
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

	store.dispatch(fetchMetaData('http://meta.icos-cp.eu/ontologies/cpmeta/instances/wdcggDataObject'));

	return store;
}

