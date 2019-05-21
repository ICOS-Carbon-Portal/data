import {ERROR, INIT, STATION_MEASUREMENTS, BINTABLE} from './actions';
import * as Toaster from 'icos-cp-toaster';
import Stats from './models/Stats';

const initState = {
	stats: new Stats()
};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case INIT:
			return update({
				stats: state.stats.withParams(action.stationId, action.valueType, action.height)
			});

		case STATION_MEASUREMENTS:
			return update({
				stats: state.stats.withMeasurements(action.measurements)
			});

		case BINTABLE:
			return update({
				stats: state.stats.withData(action)
			});

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
