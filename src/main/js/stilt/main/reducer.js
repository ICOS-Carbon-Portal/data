import {FETCHED_INITDATA, FETCHED_TIMESERIES, FETCHED_RASTER, SET_SELECTED_STATION, SET_SELECTED_YEAR, SET_DATE_RANGE, SET_VISIBILITY, ERROR} from './actions';
import {makeTimeSeriesGraphData} from './models/timeSeriesHelpers';
import FootprintsRegistry from './models/FootprintsRegistry';
import copyprops from '../../common/main/general/copyprops';

export default function(state, action){

	switch(action.type){

		case FETCHED_INITDATA:
			return updateWith(['wdcggFormat', 'stations', 'countriesTopo']);

		case FETCHED_RASTER:
			return state.desiredFootprint.date == action.footprint.date
				? updateWith(['raster', 'footprint'])
				: state;

		case SET_SELECTED_STATION:
			const station = action.station;

			return keep(['wdcggFormat', 'stations', 'countriesTopo', 'modelComponentsVisibility'], {
				selectedStation: station,
				selectedYear: station.years.length == 1
					? station.years[0]
					: null
			});

		case SET_SELECTED_YEAR:
			return update({
				selectedYear: state.selectedStation.years.find(year => year.year == action.year)
			});

		case FETCHED_TIMESERIES:
			if(checkStationId(action.stationId) && checkYear(action.year)){

				const footprints = new FootprintsRegistry(action.footprints);
				const seriesId = action.stationId + '_' + action.year;
				const timeSeriesData = makeTimeSeriesGraphData(action.obsBinTable, action.modelResults, seriesId);

				return update({timeSeriesData}, {footprints});
			} else return state;

		case SET_DATE_RANGE:
			const dateRange = action.dateRange;
			const midDate = new Date(dateRange[0]/2 + dateRange[1]/2);
			const desiredFootprint = state.footprints ? state.footprints.getRelevantFootprint(midDate) : null;
			return update({desiredFootprint, dateRange});

		case SET_VISIBILITY:
			const modelComponentsVisibility = Object.assign({}, state.modelComponentsVisibility, action.update);
			return update({modelComponentsVisibility});

		case ERROR:
			return updateWith(['error']);

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

	function updateWith(actionProps){
		return update(copyprops(action, actionProps));
	}

}
