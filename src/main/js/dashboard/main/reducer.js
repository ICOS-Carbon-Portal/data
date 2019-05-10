import {ERROR, INIT, STATION_MEASUREMENTS} from './actions';
import * as Toaster from 'icos-cp-toaster';

const initState = {
	measurements: []
};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case INIT:
			return update({});

		case STATION_MEASUREMENTS:
			return update({
				measurements: action.measurements
			});

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
