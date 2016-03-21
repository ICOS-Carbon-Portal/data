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

	// store.dispatch(fetchMetaData({tableId:"H1x6aemQBWPQePvj5j2-He2Q"}));
	// store.dispatch(fetchMetaData({tableId:"tUejqnYZX62KBE3z1ZqdciEb"}));
	// store.dispatch(fetchMetaData({tableId:"vaxtvnqKtHsFkiPX_Kwp4O2q"}));
	// store.dispatch(fetchMetaData({tableId:"NgNOyWp-I3zYLlwRtLx_UBem"}));
	store.dispatch(fetchMetaData({tableId:"XWYYvq452XncgAUaeoYEumKM"}));

	return store;
}

