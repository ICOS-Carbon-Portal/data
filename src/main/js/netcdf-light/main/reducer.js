import {ERROR, COUNTRIES_FETCHED, RASTER_FETCHED, GAMMA_SELECTED} from './actions';
import ColorMaker from './models/ColorMaker';
import * as Toaster from 'icos-cp-toaster';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return Object.assign({}, state, {
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case COUNTRIES_FETCHED:
			return update({
				event: COUNTRIES_FETCHED,
				countriesTopo: action.countriesTopo
			});

		case GAMMA_SELECTED:
			const newGammaControls = state.controls.withSelectedGamma(action.idx);
			const selectedGamma = newGammaControls.gammas.selected;

			if(state.raster){
				state.raster.id = state.raster.basicId + selectedGamma;
			}

			return Object.assign({}, state, {
				controls: newGammaControls,
				colorMaker: state.raster
					? new ColorMaker(state.raster.stats.min, state.raster.stats.max, selectedGamma)
					: null
			});

		case RASTER_FETCHED:
			return update({
				event: RASTER_FETCHED,
				raster: action.raster,
				colorMaker: new ColorMaker(action.raster.stats.min, action.raster.stats.max, state.params.get('gamma'))
			});

		default:
			return update({event: undefined});
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
