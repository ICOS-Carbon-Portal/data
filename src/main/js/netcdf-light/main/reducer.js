import {ERROR, COUNTRIES_FETCHED, RASTER_FETCHED} from './actions';
import * as Toaster from 'icos-cp-toaster';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return update({
				event: ERROR,
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case COUNTRIES_FETCHED:
			return update({
				event: COUNTRIES_FETCHED,
				countriesTopo: action.countriesTopo
			});

		case RASTER_FETCHED:
			return update({
				event: RASTER_FETCHED,
				raster: action.raster
			});

		default:
			return update({event: undefined});
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}