import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {fetchServices, setService, fetchCountriesTopo, selectGamma, failWithError} from './actions.js';
import {ControlsHelper} from './models/ControlsHelper';

const pathName = window.location.pathname;
const sections = pathName.split('/');
const pidIdx = sections.indexOf('netcdf') + 1;
const pid = sections[pidIdx];
const isIframe = pid !== '';

const searchStr = window.decodeURIComponent(window.location.search).replace(/^\?/, '');
const keyValpairs = searchStr.split('&');
const searchParams = keyValpairs.reduce((acc, curr) => {
	const p = curr.split('=');
	acc[p[0]] = p[1];
	return acc;
}, {});

const controls = new ControlsHelper();
export const defaultGamma = 1;
const gammaIdx = searchParams.gamma
	? controls.gammas.values.indexOf(parseFloat(searchParams.gamma))
	: controls.gammas.values.indexOf(defaultGamma);

const initState = {
	isIframe,
	colorMaker: undefined,
	controls,
	countriesTopo: {
		ts: 0,
		data: undefined
	},
	desiredId: undefined,
	lastElevation: undefined,
	initSearchParams: {
		varName: searchParams.varName,
		date: searchParams.date,
		gamma: searchParams.gamma,
		elevation: searchParams.elevation,
		center: searchParams.center,
		zoom: searchParams.zoom,
	},
	playingMovie: false,
	rasterFetchCount: 0,
	raster: undefined,
	rasterDataFetcher: undefined,
	toasterData: undefined
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
	store.dispatch(fetchCountriesTopo);
	store.dispatch(selectGamma(gammaIdx));

	if (isIframe) {
		if (pid) {
			store.dispatch(setService(pid));
		} else {
			store.dispatch(failWithError({message: 'The request is missing a pid'}));
		}
	} else {
		store.dispatch(fetchServices);
	}
	return store;
}