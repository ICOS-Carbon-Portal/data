import { getDownloadCounts, getDownloadsByCountry, getAvars, getSpecifications, getFormats, getDataLevels, getStations,
	getContributors, getCountriesGeoJson, getThemes, getStationsCountryCode, getDownloadsPerDateUnit,
	getPreviewTimeserie, getPopularTimeserieVars, getPreviewNetCDF} from './backend';
import {getConfig} from "./models/RadioConfig";
import {formatPopularTimeserieVars, formatTimeserieData, formatNetCDFData} from "./reducer";

export const ERROR = 'ERROR';
export const DOWNLOAD_STATS_FETCHED = 'DOWNLOAD_STATS_FETCHED';
export const FILTERS = 'FILTERS';
export const STATS_UPDATE = 'STATS_UPDATE';
export const STATS_UPDATED = 'STATS_UPDATED';
export const COUNTRIES_FETCHED = 'COUNTRIES_FETCHED';
export const DOWNLOAD_STATS_PER_DATE_FETCHED = 'DOWNLOAD_STATS_PER_DATE_FETCHED';
export const SET_VIEW_MODE = 'SET_VIEW_MODE';
export const RADIO_CREATE = 'RADIO_CREATE';
export const PREVIEW_DATA_FETCHED = 'PREVIEW_DATA_FETCHED';
export const RADIO_UPDATED = 'RADIO_UPDATED';

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: ERROR,
		error
	});
};

export const init = (dispatch, getState) => {
	const viewMode = getState().view.mode;
	dispatch(fetchDataForView(viewMode));
};

export const setViewMode = mode => dispatch => {
	dispatch({
		type: SET_VIEW_MODE,
		mode
	});

	dispatch(fetchDataForView(mode));
};

const fetchDataForView = viewMode => dispatch => {
	if (viewMode === "downloads"){
		dispatch(initDownloads);
	} else if (viewMode === "previews"){
		dispatch(initPreviewView);
	}
};

const initDownloads = dispatch => {
	dispatch(fetchDownloadStats({}));
	dispatch(fetchFilters);
	dispatch(fetchCountries);
};

const initPreviewView = dispatch => {
	dispatch(fetchPreviewData('previewPopularTimeserieVars'));

	const radioConfigMain = getConfig('main');

	dispatch({
		type: RADIO_CREATE,
		radioConfig: radioConfigMain,
		radioAction: actionTxt => {
			dispatch(radioSelected(radioConfigMain, actionTxt));
			dispatch(fetchPreviewData(actionTxt));
		}
	});

	const radioConfigSub = getConfig('popularTSVars');

	dispatch({
		type: RADIO_CREATE,
		radioConfig: radioConfigSub,
		radioAction: actionTxt => dispatch(radioSelected(radioConfigSub, actionTxt))
	});
};

const fetchPreviewData = actionTxt => dispatch => {
	const {fetchFn, formatter} = getPreviewDataQuery(actionTxt);
	dispatch(fetchPreviewDataFromBackend(fetchFn, formatter));
};

const fetchPreviewDataFromBackend = (fetchFn, formatter, page = 1) => dispatch => {
	fetchFn(page).then(previewDataResult => {
		dispatch({
			type: PREVIEW_DATA_FETCHED,
			page,
			previewDataResult,
			fetchFn,
			formatter
		});
	});
};

const getPreviewDataQuery = actionTxt => {
	switch (actionTxt){
		case 'previewPopularTimeserieVars':
			return {
				fetchFn: getPopularTimeserieVars,
				formatter: formatPopularTimeserieVars
			};

		case 'previewTimeserie':
			return {
				fetchFn: getPreviewTimeserie,
				formatter: formatTimeserieData
			};

		case 'previewNetCDF':
			return {
				fetchFn: getPreviewNetCDF,
				formatter: formatNetCDFData
			};
	}
};

export const radioSelected = (radioConfig, actionTxt) => dispatch => {
	dispatch({
		type: RADIO_UPDATED,
		radioConfig,
		actionTxt
	});
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
	const viewMode = getState().view.mode;

	if (viewMode === "downloads"){
		dispatch(requestPageDownloads(page));
	} else if (viewMode === "previews"){
		dispatch(requestPagePreviews(page));
	}
};

const requestPageDownloads = page => (dispatch, getState) => {
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

const requestPagePreviews = page => (dispatch, getState) => {
	const {fetchFn, formatter} = getState().lastPreviewCall;
	dispatch(fetchPreviewDataFromBackend(fetchFn, formatter, page));
};


const useFullCollection = filters => {
	return Object.keys(filters).length === 0 || Object.keys(filters).every(key => filters[key].length === 0);
};
