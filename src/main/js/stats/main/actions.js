import { getDownloadCounts, getDownloadsByCountry, getAvars, getSpecifications, getFormats, getDataLevels, getStations,
	getContributors, getCountriesGeoJson, getThemes, getStationsCountryCode, getDownloadsPerDateUnit} from './backend';

export const ERROR = 'ERROR';
export const DOWNLOAD_STATS_FETCHED = 'DOWNLOAD_STATS_FETCHED';
export const FILTERS = 'FILTERS';
export const STATS_UPDATE = 'STATS_UPDATE';
export const STATS_UPDATED = 'STATS_UPDATED';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const DOWNLOAD_STATS_PER_DATE_FETCHED = 'DOWNLOAD_STATS_PER_DATE_FETCHED';

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
			});

			dispatch(fetchDownloadStatsPerDateUnit('week', avars));
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
			});
		}
	)
};

export const fetchDownloadStatsPerDateUnit = (dateUnit, avars) => (dispatch, getState) => {
	const avarsGetter = avars => {
		if (avars === undefined){
			const state = getState();
			const filters = state.downloadStats.filters;
			return getAvars(filters, state.stationCountryCodeLookup);
		} else {
			return avars;
		}
	};

	getDownloadsPerDateUnit(dateUnit, avarsGetter(avars))
		.then(downloadsPerDateUnit => {
			dispatch({
				type: DOWNLOAD_STATS_PER_DATE_FETCHED,
				dateUnit,
				downloadsPerDateUnit
			});
		});
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
			});

			dispatch(fetchDownloadStatsPerDateUnit(state.statsGraph.dateUnit, avars))
		});
};

export const requestPage = page => (dispatch, getState) => {
	const state = getState();
	const filters = state.downloadStats.filters;
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(avars, page), getDownloadsByCountry(avars)])
		.then(([downloadStats, countryStats]) => {
			dispatch({
				type: DOWNLOAD_STATS_FETCHED,
				downloadStats,
				countryStats,
				filters,
				page
			});

			dispatch(fetchDownloadStatsPerDateUnit(state.statsGraph.dateUnit, avars));
		});
};
