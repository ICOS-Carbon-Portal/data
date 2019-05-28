import {signals} from './actions';
import * as Toaster from 'icos-cp-toaster';
import Stats from './models/Stats';

const initState = {
	stats: new Stats()
};

export default function(state = initState, action){

	switch(action.type){

		case signals.ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case signals.INIT:
			return update({
				stats: state.stats.withParams(action.stationId, action.valueType, action.height)
			});

		case signals.STATION_MEASUREMENTS:
			return update({
				stats: state.stats.withMeasurements(action.measurements)
			});

		case signals.BINTABLE:
			return update({
				stats: state.stats.withData(action)
			});

		case signals.SWITCH_TIMEPERIOD:
			return update({
				stats: state.stats.withTimePeriod(action.timePeriod)
			});

		default:
			return state;
	}

	function update() {
		return Object.assign.apply(Object, [{}, state].concat(...arguments));
	}
}
