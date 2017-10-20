import {ERROR, DOWNLOADCOUNTS_FETCHED, FILTERS, STATS_UPDATE} from './actions';
import * as Toaster from 'icos-cp-toaster';
import StatsTable from './models/StatsTable';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case DOWNLOADCOUNTS_FETCHED:
			const statsTable = new StatsTable(action.downloadCounts._embedded)
			return update({
				downloadCounts: statsTable,
				displayedStats: statsTable
				// downloadCounts: {
				// 	stat: stat
				// }
				// downloadCounts: {
				// 	dobjs: action.downloadCounts._embedded,
				// 	returned: action.downloadCounts._returned,
				// 	size: action.downloadCounts._size,
				// 	total_pages: action.downloadCounts._total_pages
				// }
			})

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
				}]
			})

		case STATS_UPDATE:
			return update({
				displayedStats: state.downloadCounts.withFilter(action.varName, action.values),
				downloadCounts: state.downloadCounts
				// downloadCounts: state.downloadCounts.withoutFilter()
				// downloadCounts: {
				// 	dobjs: state.downloadCounts.dobjs.filter(dobj => dobj.specification[action.varName] == action.values),
				// 	returned: state.downloadCounts._returned,
				// 	size: state.downloadCounts._size,
				// 	total_pages: state.downloadCounts._total_pages
				// }
			})

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
