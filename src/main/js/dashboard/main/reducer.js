import {actionTypes} from './actions';
import * as Toaster from 'icos-cp-toaster';
import Stats from './models/Stats';

const initState = {
	stats: new Stats(),
	displayMsg: undefined
};

export default function(state = initState, action){

	switch(action.type){

		case actionTypes.ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case actionTypes.DISPLAY_MSG:
			return update({
				displayMsg: action.error.message.split('\n')[0]
			});

		case actionTypes.INIT:
			return update({
				stats: state.stats.withParams(action.stationId, action.valueType, action.height)
			});

		case actionTypes.STATION_MEASUREMENTS:
			return update({
				stats: state.stats.withMeasurements(action.measurements)
			});

		case actionTypes.BINTABLE:
			return update({
				stats: state.stats.withData(action)
			});

		case actionTypes.SWITCH_TIMEPERIOD:
			return update({
				stats: state.stats.withTimePeriod(action.timePeriod)
			});

		case actionTypes.SWITCH_HEIGHT:
			return update({
				stats: state.stats.withHeight(action.height)
			});

		case actionTypes.SWITCH_VALUETYPE:
			return update({
				stats: state.stats.withValueType(action.valueType)
			});

		default:
			return state;
	}

	function update() {
		return Object.assign.apply(Object, [{}, state].concat(...arguments));
	}
}
