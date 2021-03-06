import { getCountriesGeoJson, getPreviewAggregation, getPopularTimeserieVars, postToApi, getSearchParams, getDownloadStatsApi, getStationsApi,
	getSpecsApi, getContributorsApi, getSubmittersApi, getCountryCodesLookup} from './backend';
import {getStationCountryCodes} from './sparql';
import {getConfig} from "./models/RadioConfig";
import {labelSorter} from './reducer';

export const actionTypes = {
	ERROR: 'ERROR',
	DOWNLOAD_STATS_FETCHED: 'DOWNLOAD_STATS_FETCHED',
	FILTERS: 'FILTERS',
	STATS_UPDATE: 'STATS_UPDATE',
	STATS_UPDATED: 'STATS_UPDATED',
	COUNTRIES_FETCHED: 'COUNTRIES_FETCHED',
	DOWNLOAD_STATS_PER_DATE_FETCHED: 'DOWNLOAD_STATS_PER_DATE_FETCHED',
	SET_VIEW_MODE: 'SET_VIEW_MODE',
	RADIO_CREATE: 'RADIO_CREATE',
	PREVIEW_DATA_FETCHED: 'PREVIEW_DATA_FETCHED',
	RADIO_UPDATED: 'RADIO_UPDATED',
	RESET_FILTERS: 'RESET_FILTERS',
	COUNTRY_CODES_FETCHED: 'COUNTRY_CODES_FETCHED',
	SET_SPEC_LEVEL_LOOKUP: 'SET_SPEC_LEVEL_LOOKUP',
}

const failWithError = dispatch => error => {
	console.log(error);
	dispatch({
		type: actionTypes.ERROR,
		error
	});
};

export const init = (dispatch, getState) => {
	const viewMode = getState().view.mode;
	dispatch(fetchDataForView(viewMode));
};

export const setViewMode = mode => dispatch => {
	dispatch({
		type: actionTypes.SET_VIEW_MODE,
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

const initDownloads = (dispatch) => {
	dispatch(fetchCountries);
	dispatch(fetchFilters);
	dispatch(fetchDownloadStats());
};

const initPreviewView = dispatch => {
	dispatch(fetchPreviewData('getPopularTimeserieVars'));

	const radioConfigMain = getConfig('main');

	dispatch({
		type: actionTypes.RADIO_CREATE,
		radioConfig: radioConfigMain,
		radioAction: actionTxt => {
			dispatch(radioSelected(radioConfigMain, actionTxt));
			dispatch(fetchPreviewData(actionTxt));
		}
	});

	const radioConfigSub = getConfig('popularTSVars');

	dispatch({
		type: actionTypes.RADIO_CREATE,
		radioConfig: radioConfigSub,
		radioAction: actionTxt => dispatch(radioSelected(radioConfigSub, actionTxt))
	});
};

const fetchPreviewData = actionTxt => dispatch => {
	const fetchFn = actionTxt === "getPopularTimeserieVars"
		? getPopularTimeserieVars
		: getPreviewAggregation(actionTxt);
	dispatch(fetchPreviewDataFromBackend(fetchFn));
};

const fetchPreviewDataFromBackend = (fetchFn, page = 1) => dispatch => {
	fetchFn(page).then(previewDataResult => {
		dispatch({
			type: actionTypes.PREVIEW_DATA_FETCHED,
			page,
			previewDataResult,
			fetchFn
		});
	});
};

export const radioSelected = (radioConfig, actionTxt) => dispatch => {
	dispatch({
		type: actionTypes.RADIO_UPDATED,
		radioConfig,
		actionTxt
	});
};

const fetchCountries = dispatch => {
	getCountriesGeoJson().then(
		countriesTopo => {
			dispatch({
				type: actionTypes.COUNTRIES_FETCHED,
				countriesTopo
			});
		},
		err => dispatch(failWithError(err))
	);
};

export const resetFilters = () => dispatch => {
	dispatch({
		type: actionTypes.RESET_FILTERS
	});
	dispatch(fetchDownloadStats())
};

export const fetchDownloadStats = (newPage) => (dispatch, getState) => {
	const { downloadStats, specLevelLookup, dateUnit } = getState();
	const page = newPage || 1;

	const searchParams = getSearchParams(downloadStats.getSearchParamFilters(), specLevelLookup);

	Promise.all([getDownloadStatsApi(page, searchParams), postToApi('downloadsByCountry', searchParams)])
		.then(([dlStats, countryStats]) => {
			dispatch({
				type: actionTypes.DOWNLOAD_STATS_FETCHED,
				downloadStats: dlStats.stats,
				countryStats,
				filters: downloadStats.filters,
				page,
				to: dlStats.stats.length,
				objCount: dlStats.size
			});
		});
	dispatch(fetchDownloadStatsPerDateUnit(dateUnit));
};

const fetchFilters = (dispatch, getState) => {
	const { specLevelLookup } = getState();

	getCountryCodesLookup().then(
		countryCodeLookup => {
			Promise.all([getSpecsApi(), getContributorsApi(), getStationsApi(), getSubmittersApi(), postToApi('dlfrom'), getStationCountryCodes()]).then(
				([specifications, contributors, stations, submitters, dlfrom, stationCountryCodes]) => {
					const dataLevels = specifications.reduce((acc, curr) => {
						const lvl = acc.find(l => l.id === curr.level);
						if (lvl === undefined) {
							acc.push({
								id: curr.level,
								specs: [curr.id],
								count: curr.count,
								label: curr.level
							})
						} else {
							lvl.count += curr.count;
							lvl.specs.push(curr.id);
						}
						return acc;
					}, []).sort(labelSorter);

					dispatch({
						type: actionTypes.FILTERS,
						specifications,
						dataLevels,
						stations,
						contributors,
						submitters,
						countryCodeLookup,
						dlfrom,
						stationCountryCodes
					});

					if (specLevelLookup === undefined) {
						dispatch({
							type: actionTypes.SET_SPEC_LEVEL_LOOKUP,
							specLevelLookup: dataLevels.reduce((acc, dl) => {
								acc[dl.id] = dl.specs;
								return acc;
							}, {})
						})
					}
				}
			);
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchDownloadStatsPerDateUnit = dateUnit => (dispatch, getState) => {
	const { specLevelLookup, downloadStats } = getState();

	const endpoint = 'downloadsPer' + dateUnit.slice(0, 1).toUpperCase() + dateUnit.slice(1);
	const searchParams = getSearchParams(downloadStats.getSearchParamFilters(), specLevelLookup);
	const parser = d => ({ ...d, ...{ date: new Date(d.ts) } })

	postToApi(endpoint, searchParams, parser)
		.then(downloadsPerDateUnit => {
			dispatch({
				type: actionTypes.DOWNLOAD_STATS_PER_DATE_FETCHED,
				dateUnit,
				downloadsPerDateUnit
			});
		});
};

export const statsUpdate = (varName, values) => (dispatch) => {

	dispatch({
		type: actionTypes.STATS_UPDATE,
		varName,
		values
	});

	dispatch(fetchDownloadStats(1));
};

export const requestPage = page => (dispatch, getState) => {
	const viewMode = getState().view.mode;

	if (viewMode === "downloads"){
		dispatch(fetchDownloadStats(page));
	} else if (viewMode === "previews"){
		dispatch(requestPagePreviews(page));
	}
};

const requestPagePreviews = page => (dispatch, getState) => {
	const fetchFn = getState().lastPreviewCall;
	dispatch(fetchPreviewDataFromBackend(fetchFn, page));
};
