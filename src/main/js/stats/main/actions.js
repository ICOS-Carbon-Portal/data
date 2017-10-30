import { getDownloadCounts, getSpecifications, getFormats, getDataLevels } from './backend';

export const ERROR = 'ERROR';
export const DOWNLOADCOUNTS_FETCHED = 'DOWNLOADCOUNTS_FETCHED';
export const FILTERS = 'FILTERS';
export const STATS_UPDATE = 'STATS_UPDATE';
export const STATS_UPDATED = 'STATS_UPDATED';

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
}

export const fetchDownloadCounts = dispatch => {
	getDownloadCounts({}).then(
		downloadStats => {
			dispatch({
				type: DOWNLOADCOUNTS_FETCHED,
				downloadStats
			})
		}
	)
}

export const fetchFilters = dispatch => {
	Promise.all([getSpecifications(), getFormats(), getDataLevels()]).then(
		([specifications, formats, dataLevels]) => {
			dispatch({
				type: FILTERS,
				specifications,
				formats,
				dataLevels
			})
		}
	)
}

export const statsUpdate = (varName, values) => (dispatch, getState) => {

	dispatch({
		type: STATS_UPDATE,
		varName,
		values
	});

	const state = getState();
	const filters = state.downloadStats.filters;

	getDownloadCounts(filters).then(
		downloadStats => {
			dispatch({
				type: STATS_UPDATED,
				downloadStats
			})
		}
	)
}

export const fetchFilteredDownloadStats = dispatch => {

}
