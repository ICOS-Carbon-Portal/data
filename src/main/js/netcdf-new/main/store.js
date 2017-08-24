import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {fetchCountriesTopo, setService, selectGamma, failWithError} from './actions.js';
import UrlSearchParams from '../../common/main/models/UrlSearchParams';
import {ControlsHelper} from './models/ControlsHelper';

const pathName = window.location.pathname;
const sections = pathName.split('/');
const pid = sections.pop() || sections.pop();
const params = new UrlSearchParams(window.location.search, [], ['varName', 'date', 'gamma', 'elevation']);

const initState = {
	event: undefined,
	params,
	toasterData: undefined,
	countriesTopo: {
		ts: 0,
		data: undefined
	},
	raster: {
		ts: 0,
		data: undefined
	},
	controls: new ControlsHelper()
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
		if (pid) store.dispatch(setService(pid));
		store.dispatch(selectGamma(4));
	} else {
		let message = 'The request you made is not valid!';
		message += ' The request is missing these parameters: ' + params.missingParams.join(', ') + '.';

		store.dispatch(failWithError({message}));
	}
	return store;
}