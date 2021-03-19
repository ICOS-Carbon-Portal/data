import { getCountriesGeoJson, postToApi, getSearchParams, getDownloadStatsApi, getStationsApi,
	getSpecsApi, getContributorsApi, getSubmittersApi, getCountryCodesLookup, getAggregationResult} from './backend';
import {getStationCountryCodes} from './sparql';
import { getConfig, emptyRadioConf } from "./models/RadioConfig";
import { labelSorter } from './reducer';
import localConfig from './config';

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
	SET_SPEC_LEVEL_LOOKUP: 'SET_SPEC_LEVEL_LOOKUP',
	VARIOUS_STATS_FETCHED: 'VARIOUS_STATS_FETCHED',
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

	} else if (viewMode === "pylib") {
		dispatch(initLibraryDownloads);
	}
};

const initDownloads = (dispatch) => {
	dispatch(fetchCountries);
	dispatch(fetchFilters);
	dispatch(fetchDownloadStats());
};

const initPreviewView = dispatch => {
	dispatch(fetchPreviewDataFromBackend(getFetchFn("previews", "getPopularTimeserieVars")));

	const radioConfigMain = limitRadiosByEnvri(getConfig('mainPreview'));

	dispatch({
		type: actionTypes.RADIO_CREATE,
		radioConfig: radioConfigMain,
		isMain: true,
		radioAction: actionTxt => {
			dispatch(radioSelected(radioConfigMain, true, actionTxt));
			dispatch(fetchPreviewDataFromBackend(getFetchFn("previews", actionTxt)));
		}
	});

	const radioConfigSub = limitRadiosByEnvri(getConfig('popularTSVars'));

	dispatch({
		type: actionTypes.RADIO_CREATE,
		radioConfig: radioConfigSub,
		isMain: false,
		radioAction: actionTxt => dispatch(radioSelected(radioConfigSub, false, actionTxt))
	});
};

const limitRadiosByEnvri = (radioConfig) => {
	return {
		name: radioConfig.name,
		config: radioConfig.config.filter(conf => conf.envri.includes(localConfig.envri))
	};
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

const initLibraryDownloads = (dispatch, getState) => {
	dispatch(fetchVariousStatsFromBackend(getAggregationResult('getLibDownloadsByCountry')));
	
	const radioConfigMain = limitRadiosByEnvri(getConfig('mainLib'));

	dispatch({
		type: actionTypes.RADIO_CREATE,
		radioConfig: radioConfigMain,
		isMain: true,
		radioAction: actionTxt => {
			dispatch(radioSelected(radioConfigMain, true, actionTxt));
			dispatch(fetchVariousStatsFromBackend(getFetchFn(getState().view.mode, actionTxt)));
		}
	});

	dispatch({
		type: actionTypes.RADIO_CREATE,
		radioConfig: emptyRadioConf,
		isMain: false,
		radioAction: _ => _
	});
};

const getFetchFn = (viewMode, actionTxt) => {
	switch (viewMode) {
		case "previews":
			return actionTxt === "getPopularTimeserieVars"
				? (page) => getAggregationResult(actionTxt)(page, 1000)
				: getAggregationResult(actionTxt);

		case "pylib":
			return getAggregationResult(actionTxt);

		default:
			throw new Error(`Unsupported view mode: ${viewMode}`);
	}
};

const fetchVariousStatsFromBackend = (fetchFn, page = 1) => dispatch => {
	fetchFn(page).then(variousStats => {
		dispatch({
			type: actionTypes.VARIOUS_STATS_FETCHED,
			page,
			variousStats,
			fetchFn
		})
	});
};

const radioSelected = (radioConfig, isMain, actionTxt) => dispatch => {
	dispatch({
		type: actionTypes.RADIO_UPDATED,
		radioConfig,
		isMain,
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
	const state = getState();
	const viewMode = state.view.mode;
	const mainRadio = state.mainRadio;

	if (viewMode === "downloads"){
		dispatch(fetchDownloadStats(page));

	} else if (viewMode === "previews"){
		// dispatch(requestPagePreviews(page));
		dispatch(fetchPreviewDataFromBackend(getFetchFn(viewMode, mainRadio.actionTxt), page));

	} else if (viewMode === "pylib") {
		dispatch(fetchVariousStatsFromBackend(getFetchFn(viewMode, mainRadio.actionTxt), page));
	}
};
