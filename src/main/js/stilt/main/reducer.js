import {FETCHED_INITDATA, FETCHED_STATIONDATA, FETCHED_RASTER, SET_SELECTED_STATION, SET_SELECTED_YEAR,
	SET_DATE_RANGE, SET_VISIBILITY, INCREMENT_FOOTPRINT, PUSH_PLAY, SET_DELAY, ERROR} from './actions';
import {makeTimeSeriesGraphData} from './models/timeSeriesHelpers';
import FootprintsRegistry from './models/FootprintsRegistry';
import FootprintsFetcher from './models/FootprintsFetcher';
import {copyprops, deepUpdate} from 'icos-cp-utils';
import * as Toaster from 'icos-cp-toaster';

export default function(state, action){

	switch(action.type){

		case FETCHED_INITDATA:
			return updateWith(['wdcggFormat', 'stations', 'countriesTopo']);

		case FETCHED_RASTER:
			return state.desiredFootprint.date == action.footprint.date
				? updateWith(['raster', 'footprint'])
				: state;

		case SET_SELECTED_STATION:
			const station = action.selectedStation;

			return keep(['wdcggFormat', 'stations', 'countriesTopo', 'options'], {
				selectedStation: station,
				selectedYear: station.years.length == 1
					? station.years[0]
					: station.years.find(({year}) => state.selectedYear && state.selectedYear.year == year)
			});

		case SET_SELECTED_YEAR:
			return updateWith(['selectedYear']);

		case FETCHED_STATIONDATA:
			if(checkStationId(action.stationId) && checkYear(action.year)){

				const footprints = new FootprintsRegistry(action.footprints);
				const footprintsFetcher = new FootprintsFetcher(footprints, action.stationId);
				const seriesId = action.stationId + '_' + action.year;
				const timeSeriesData = makeTimeSeriesGraphData(action.obsBinTable, action.modelResults, seriesId);

				return update({timeSeriesData, footprints, footprintsFetcher});
			} else return state;

		case SET_DATE_RANGE:
			const dateRange = action.dateRange;
			let desiredFootprint = state.footprints ? state.footprints.ensureRange(state.footprint, dateRange) : null;
			let footprintsFetcher = state.footprintsFetcher ? state.footprintsFetcher.withDateRange(dateRange) : null;
			return update({desiredFootprint, dateRange, footprintsFetcher});

		case SET_VISIBILITY:
			return deepUpdate(state, ['options', 'modelComponentsVisibility'], action.update);

		case INCREMENT_FOOTPRINT:
			return state.footprint
				? update({desiredFootprint: state.footprintsFetcher.step(state.footprint, action.increment)})
				: state;

		case PUSH_PLAY:
			const playingMovie = !state.playingMovie;
			desiredFootprint = playingMovie ? state.desiredFootprint : state.footprint;
			return update({playingMovie, desiredFootprint});

		case SET_DELAY:
			footprintsFetcher = state.footprintsFetcher ? state.footprintsFetcher.withDelay(action.delay) : null;
			return update({footprintsFetcher});

		case ERROR:
			return Object.assign({}, state, {
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		default:
			return state;
	}

	function checkYear(year){
		return state.selectedYear && state.selectedYear.year == year;
	}

	function checkStationId(id){
		return state.selectedStation && state.selectedStation.id == id;
	}

	function keep(props, updatesObj){
		return Object.assign(copyprops(state, props), updatesObj); 
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates)); 
	}

	function updateWith(actionProps, path){
		return path
			? deepUpdate(state, path, copyprops(action, actionProps))
			: update(copyprops(action, actionProps));
	}

}

