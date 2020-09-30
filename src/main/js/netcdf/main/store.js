import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {ControlsHelper} from './models/ControlsHelper';
import config from '../../common/main/config';
import { selectColorRamp, fetchServices, setService, fetchTitle, fetchCountriesTopo, selectGamma, failWithError, fetchMetadata } from "./actions";
import {colorRamps} from '../../common/main/models/ColorMaker';

const isSites = config.envri === "SITES";

const pathName = window.location.pathname;
const sections = pathName.split('/');
const pidIdx = sections.indexOf('netcdf') + 1;
const pid = sections[pidIdx];
const isPIDProvided = pid !== '';

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
let colorIdx = searchParams.color
	? colorRamps.findIndex(color => color.name === searchParams.color)
	: 0;
colorIdx = colorIdx === -1 ? 0 : colorIdx;

const initState = {
	isSites,
	isPIDProvided,
	metadata: undefined,
	minMax: undefined,
	legendLabel: 'Legend',
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
		color: searchParams.color,
	},
	playingMovie: false,
	rasterFetchCount: 0,
	raster: undefined,
	rasterDataFetcher: undefined,
	title: undefined,
	toasterData: undefined,
	isFetchingTimeserieData: false,
	timeserieData: [],
	timeserieParams: undefined,
	latlng: undefined,
	showTSSpinner: false
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
	store.dispatch(selectColorRamp(colorIdx));

	if (isPIDProvided) {
		store.dispatch(fetchMetadata(pid));

		if (!window.frameElement) {
			store.dispatch(fetchTitle(pid));
		}
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
