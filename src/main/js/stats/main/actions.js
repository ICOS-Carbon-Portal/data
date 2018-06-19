import { getDownloadCounts, getDownloadsByCountry, getAvars, getSpecifications, getFormats, getDataLevels, getStations,
	getContributors, getCountriesGeoJson, getThemes, getStationsCountryCode } from './backend';

export const ERROR = 'ERROR';
export const DOWNLOAD_STATS_FETCHED = 'DOWNLOAD_STATS_FETCHED';
export const FILTERS = 'FILTERS';
export const STATS_UPDATE = 'STATS_UPDATE';
export const STATS_UPDATED = 'STATS_UPDATED';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};

export const fetchCountries = dispatch => {
	getCountriesGeoJson().then(
		countriesTopo => {
			dispatch({
				type: COUNTRIES_FETCHED,
				countriesTopo
			});
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchDownloadStats = filters => (dispatch, getState) => {
	const state = getState();
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(avars), getDownloadsByCountry(avars)])
		.then(([downloadStats, countryStats]) => {
			dispatch({
				type: DOWNLOAD_STATS_FETCHED,
				downloadStats,
				countryStats,
				filters,
				page: 1
			})
		});
};

export const fetchFilters = (dispatch, getState) => {
	Promise.all([getSpecifications(), getFormats(), getDataLevels(), getStations(), getContributors(), getThemes(), getStationsCountryCode()]).then(
		([specifications, formats, dataLevels, stations, contributors, themes, countryCodes]) => {
			const state = getState();
			let countryCodesLabels = countryCodes.countryCodeFilter;
			state.stationCountryCodeLookup = countryCodes.stationCountryCodeLookup;
			dispatch({
				type: FILTERS,
				specifications,
				formats,
				dataLevels,
				stations,
				contributors,
				themes,
				countryCodes: countryCodesLabels
			})
		}
	)
};

export const statsUpdate = (varName, values) => (dispatch, getState) => {

	dispatch({
		type: STATS_UPDATE,
		varName,
		values
	});

	const state = getState();
	const filters = state.downloadStats.filters;
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(avars), getDownloadsByCountry(avars)])
		.then(([downloadStats, countryStats]) => {
			dispatch({
				type: STATS_UPDATED,
				downloadStats,
				countryStats
			})
		});
};

export const requestPage = page => (dispatch, getState) => {
	const state = getState();
	const filters = state.downloadStats.filters;
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(avars), getDownloadsByCountry(avars)])
		.then(([downloadStats, countryStats]) => {
			dispatch({
				type: DOWNLOAD_STATS_FETCHED,
				downloadStats,
				countryStats,
				filters,
				page
			})
		});
};
