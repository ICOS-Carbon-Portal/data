import { getDownloadCounts, getDownloadsByCountry, getAvars, getSpecifications, getFormats, getDataLevels, getStations,
	getContributors, getCountriesGeoJson, getThemes, getStationsCountryCode, getDownloadsPerDateUnit,
	getPreviewTimeserie, getPopularTimeserieVars} from './backend';

export const ERROR = 'ERROR';
export const DOWNLOAD_STATS_FETCHED = 'DOWNLOAD_STATS_FETCHED';
export const FILTERS = 'FILTERS';
export const STATS_UPDATE = 'STATS_UPDATE';
export const STATS_UPDATED = 'STATS_UPDATED';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const DOWNLOAD_STATS_PER_DATE_FETCHED = 'DOWNLOAD_STATS_PER_DATE_FETCHED';
export const SET_VIEW_MODE = 'SET_VIEW_MODE';
export const PREVIEW_TS = 'PREVIEW_TS';
export const PREVIEW_POPULAR_TS_VARS = 'PREVIEW_POPULAR_TS_VARS';

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};

export const init = dispatch => {
	dispatch(fetchDownloadStats({}));
	dispatch(fetchFilters);
	dispatch(fetchCountries);
};

const initPreviewView = dispatch => {
	console.log("initPreviewView");

	getPreviewTimeserie().then((previewTimeserie) => {
		dispatch({
			type: PREVIEW_TS,
			previewTimeserie
		});
	});

	getPopularTimeserieVars().then(popularTimeserieVars => {
		dispatch({
			type: PREVIEW_POPULAR_TS_VARS,
			popularTimeserieVars
		});
	});
};

export const setViewMode = mode => dispatch => {
	dispatch({
		type: SET_VIEW_MODE,
		mode
	})
};

const fetchCountries = dispatch => {
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
	const useFullColl = useFullCollection(filters);
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(useFullColl, avars), getDownloadsByCountry(useFullColl, avars)])
		.then(([downloadStats, countryStats]) => {
			dispatch({
				type: DOWNLOAD_STATS_FETCHED,
				downloadStats,
				countryStats,
				filters,
				page: 1
			});

			dispatch(fetchDownloadStatsPerDateUnit(state.dateUnit, avars));
		});
};

const fetchFilters = (dispatch, getState) => {
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
	const state = getState();
	const filters = state.downloadStats.filters;
	const useFullColl = useFullCollection(filters);

	const avarsGetter = avars => {
		if (avars === undefined){
			return getAvars(filters, state.stationCountryCodeLookup);
		} else {
			return avars;
		}
	};

	getDownloadsPerDateUnit(useFullColl, dateUnit, avarsGetter(avars))
		.then(downloadsPerDateUnit => {
			dispatch({
				type: DOWNLOAD_STATS_PER_DATE_FETCHED,
				dateUnit,
				downloadsPerDateUnit
			});

			dispatch(initPreviewView);
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
	const useFullColl = useFullCollection(filters);
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(useFullColl, avars), getDownloadsByCountry(useFullColl, avars)])
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
	const useFullColl = useFullCollection(filters);
	const avars = getAvars(filters, state.stationCountryCodeLookup);

	Promise.all([getDownloadCounts(useFullColl, avars, page), getDownloadsByCountry(useFullColl, avars)])
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

const useFullCollection = filters => {
	return Object.keys(filters).length === 0 || Object.keys(filters).every(key => filters[key].length === 0);
};
