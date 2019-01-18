import {ERROR, COUNTRIES_FETCHED, DOWNLOAD_STATS_FETCHED, FILTERS, STATS_UPDATE, STATS_UPDATED,
	DOWNLOAD_STATS_PER_DATE_FETCHED} from './actions';
import * as Toaster from 'icos-cp-toaster';
import StatsTable from './models/StatsTable';
import StatsGraph from './models/StatsGraph';


export default function(state, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case COUNTRIES_FETCHED:
			return update({statsMap: state.statsMap.withCountriesTopo(action.countriesTopo)});

		case DOWNLOAD_STATS_FETCHED:
			const stats = action.downloadStats._embedded.map(obj =>
				Object.assign(obj, {"_id": obj._id.slice(0, 24)})
			);

			return update({
				downloadStats: new StatsTable(stats, action.filters),
				statsMap: state.statsMap.withCountryStats(action.countryStats),
				paging: {
					offset: action.page,
					to: action.downloadStats._returned,
					objCount: action.downloadStats._size,
					pagesize: 100
				}
			});

		case DOWNLOAD_STATS_PER_DATE_FETCHED:
			return update({statsGraph: new StatsGraph(action.dateUnit, action.downloadsPerDateUnit)});

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
				statsMap: state.statsMap.withCountryStats(action.countryStats),
				paging: {
					offset: 1,
					to: action.downloadStats._returned,
					objCount: action.downloadStats._size,
					pagesize: 100
				}
			});

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
