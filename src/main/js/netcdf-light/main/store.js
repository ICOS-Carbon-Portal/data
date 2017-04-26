import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {fetchCountriesTopo, fetchRaster} from './actions';
import UrlSearchParams from '../../common/main/models/UrlSearchParams';
import {failWithError} from './actions';

const params = new UrlSearchParams(window.location.search, ['service', 'varName', 'date', 'gamma'], ['elevation']);

const getErr = () => {
	let errMsg = 'The request you made is not valid!';
	errMsg += ' It must contain these parameters: ' + params.required.join(', ') + '.';
	errMsg += ' The request is missing these parameters: ' + params.missingParams.join(', ') + '.';

	return {
		message: errMsg
	};
};

const initState = {
	event: undefined,
	params,
	toasterData: undefined,
	countriesTopo: undefined,
	raster: undefined
};

// function logger({ getState }) {
// 	return (next) => (action) => {
// 		console.log('will dispatch', action)
//
// 		// Call the next dispatch method in the middleware chain.
// 		let returnValue = next(action)
//
// 		console.log('state after dispatch', getState())
//
// 		// This will likely be the action itself, unless
// 		// a middleware further in chain changed it.
// 		return returnValue
// 	}
// }

export default function(){
	const store = createStore(reducer, initState, applyMiddleware(thunkMiddleware));

	if (params.isValidParams) {
		store.dispatch(fetchCountriesTopo);
		store.dispatch(fetchRaster);
	} else {
		store.dispatch(failWithError(getErr()));
	}
	return store;
}