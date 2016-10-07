import {ERROR, COUNTRIES_FETCHED, SERVICES_FETCHED, VARIABLES_AND_DATES_FETCHED, ELEVATIONS_FETCHED, CTRL_HELPER_UPDATED, RASTER_FETCHED,
	SERVICE_SELECTED, VARIABLE_SELECTED, DATE_SELECTED, ELEVATION_SELECTED, GAMMA_SELECTED} from './actions';
import {Control} from './models/ControlsHelper';
import ColorMaker from './models/ColorMaker';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		case COUNTRIES_FETCHED:
			return Object.assign({}, state, {
				status: COUNTRIES_FETCHED,
				countriesTopo: action.countriesTopo
			});

		case SERVICES_FETCHED:
			return Object.assign({}, state, {
				status: SERVICES_FETCHED,
				controls: state.controls.withServices(new Control(action.services), state.controls.lastChangedControl)
			});

		case VARIABLES_AND_DATES_FETCHED:
			return isFetched(state, action)
				? Object.assign({}, state, {
					status: VARIABLES_AND_DATES_FETCHED,
					controls: state.controls.withVariables(new Control(action.variables), state.controls.lastChangedControl)
											.withDates(new Control(action.dates), state.controls.lastChangedControl)
				})
				: state;

		case ELEVATIONS_FETCHED:
			return isElevationsFetched(state, action)
				? Object.assign({}, state, {
					status: ELEVATIONS_FETCHED,
					controls: state.controls.withElevations(new Control(filterElevations(action.elevations)), state.controls.lastChangedControl)
				})
				: state;

		case SERVICE_SELECTED:
			return Object.assign({}, state, {
				status: SERVICE_SELECTED,
				controls: state.controls.withSelectedService(action.idx)
			});

		case VARIABLE_SELECTED:
			return Object.assign({}, state, {controls: state.controls.withSelectedVariable(action.idx)});

		case DATE_SELECTED:
			return Object.assign({}, state, {controls: state.controls.withSelectedDate(action.idx)});

		case ELEVATION_SELECTED:
			return Object.assign({}, state, {controls: state.controls.withSelectedElevation(action.idx)});

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
			return isRasterFetched(state, action)
				? Object.assign({}, state, {
					status: RASTER_FETCHED,
					raster: action.raster,
					colorMaker: new ColorMaker(action.raster.stats.min, action.raster.stats.max, state.controls.gammas.selected)
				})
				: state;

		default:
			return state;
	}
}

function filterElevations(elevations){
	//TODO: Remove this when backend filters elevations
	return elevations.length == 1 && elevations[0] == "null"
		? []
		: Array.from(new Set(elevations));
}

function isFetched(state, action){
	return action.service == state.controls.services.selected;
}

function isElevationsFetched(state, action){
	return action.controls.services.selected == state.controls.services.selected
		&& action.controls.variables.selected == state.controls.variables.selected;
}

function isRasterFetched(state, action){
	return action.controls.services.selected == state.controls.services.selected &&
		action.controls.variables.selected == state.controls.variables.selected &&
		action.controls.dates.selected == state.controls.dates.selected &&
		action.controls.elevations.selected == state.controls.elevations.selected;
}