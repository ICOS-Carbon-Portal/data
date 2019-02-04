import {ERROR, COUNTRIES_FETCHED, DOWNLOAD_STATS_FETCHED, FILTERS, STATS_UPDATE, STATS_UPDATED,
	DOWNLOAD_STATS_PER_DATE_FETCHED, SET_VIEW_MODE,
	PREVIEW_TS, PREVIEW_POPULAR_TS_VARS} from './actions';
import * as Toaster from 'icos-cp-toaster';
import StatsTable from './models/StatsTable';
import StatsGraph from './models/StatsGraph';
import ViewMode from "./models/ViewMode";
import StatsMap from "./models/StatsMap";


const initState = {
	view: new ViewMode(),
	downloadStats: new StatsTable({}),
	statsMap: new StatsMap(),
	statsGraph: new StatsGraph(),
	paging: {
		offset: 0,
		to: 0,
		objCount: 0,
		pagesize: 100
	},
	dateUnit: 'week',

};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case SET_VIEW_MODE:
			return update({
				view: state.view.setMode(action.mode)
			});

		case COUNTRIES_FETCHED:
			return update({statsMap: state.statsMap.withCountriesTopo(action.countriesTopo)});

		case DOWNLOAD_STATS_FETCHED:
			return update({
				downloadStats: new StatsTable(action.downloadStats._embedded, action.filters),
				statsMap: state.statsMap.withCountryStats(action.countryStats._embedded),
				paging: {
					offset: action.page,
					to: action.downloadStats._returned,
					objCount: action.downloadStats._size,
					pagesize: 100
				}
			});

		case DOWNLOAD_STATS_PER_DATE_FETCHED:
			return update({
				statsGraph: new StatsGraph(action.dateUnit, action.downloadsPerDateUnit),
				dateUnit: action.dateUnit
			});

		case FILTERS:
			return update({
				filters: [{
					name: "specification",
					values: action.specifications._embedded
				}, {
					name: "format",
					values: action.formats._embedded
				}, {
					name: "dataLevel",
					values: action.dataLevels._embedded
				}, {
					name: "stations",
					values: action.stations._embedded
				}, {
					name: "contributors",
					values: action.contributors._embedded
				}, {
					name: "themes",
					values: action.themes._embedded
				}, {
					name: "countryCodes",
					values: action.countryCodes
				}]
			});

		case STATS_UPDATE:
			return update({
				downloadStats: state.downloadStats.withFilter(action.varName, action.values)
			});

		case STATS_UPDATED:
			return update({
				downloadStats: new StatsTable(action.downloadStats._embedded, state.downloadStats.filters),
				statsMap: state.statsMap.withCountryStats(action.countryStats._embedded),
				paging: {
					offset: 1,
					to: action.downloadStats._returned,
					objCount: action.downloadStats._size,
					pagesize: 100
				}
			});

		case PREVIEW_TS:
			return update({
				previewTimeserie: formatTimeserieData(action.previewTimeserie)
			});

		case PREVIEW_POPULAR_TS_VARS:
			return update({
				previewPopularTimeserieVars: action.popularTimeserieVars
			});

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

const formatTimeserieData = previewTimeserie => {
	return previewTimeserie.map(dobj => {
		return Object.assign(dobj, {
			x: dobj.x.sort((a, b) => a.count < b.count).map(x => x.name).join(', '),
			y: dobj.y.sort((a, b) => a.count < b.count).map(y => y.name).join(', ')
		})
	});
};
