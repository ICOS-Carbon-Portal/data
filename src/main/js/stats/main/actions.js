import { getDownloadCounts, getSpecifications, getFormats, getDataLevels } from './backend';

export const ERROR = 'ERROR';
export const DOWNLOADCOUNTS_FETCHED = 'DOWNLOADCOUNTS_FETCHED';
export const FILTERS = 'FILTERS';
export const STATS_UPDATE = 'STATS_UPDATE';

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
}

export const fetchDownloadCounts = dispatch => {
	getDownloadCounts().then(
		downloadCounts => {
			dispatch({
				type: DOWNLOADCOUNTS_FETCHED,
				downloadCounts
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

export const statsUpdate = (varName, values) => dispatch => {
	dispatch({
		type: STATS_UPDATE,
		varName,
		values
	});
}

export const fetchFilteredDownloadStats = dispatch => {

}
