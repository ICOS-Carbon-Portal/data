import { actionTypes } from './actions';
import * as Toaster from 'icos-cp-toaster';
import StatsTable from './models/StatsTable';
import StatsGraph from './models/StatsGraph';
import ViewMode from "./models/ViewMode";
import StatsMap from "./models/StatsMap";
import {Radio} from "./models/RadioConfig";
import localConfig from './config';
import FilterTemporal from "./models/FilterTemporal";


export const initState = {
	view: new ViewMode(localConfig.envri),
	downloadStats: new StatsTable({}),
	statsMap: new StatsMap(),
	statsGraph: new StatsGraph(),
	specProjectLookup: undefined,
	specLevelLookup: undefined,
	countryCodeLookup: undefined,
	paging: {
		page: 0,
		to: 0,
		objCount: 0,
		pagesize: localConfig.pagesize
	},
	dateUnit: 'week',
	previewData: undefined,
	previewDataFull: undefined,
	previewSize: undefined,
	filters: undefined,
	mainRadio: undefined,
	subRadio: undefined,
	variousStats: undefined,
	toasterData: undefined,
};

export default function(state = initState, action){

	switch(action.type){

		case actionTypes.ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case actionTypes.SET_VIEW_MODE:
			return update({
				view: state.view.setMode(action.mode),
				statsGraph: {},
				dateUnit: initState.dateUnit
			});

		case actionTypes.COUNTRIES_FETCHED:
			return update({ statsMap: state.statsMap.withCountriesTopo(action.countriesTopo) });

		case actionTypes.DOWNLOAD_STATS_FETCHED:
			return update({
				downloadStats: state.downloadStats.update(action.downloadStats, action.filters, action.page),
				statsMap: state.statsMap.withCountryStats(action.countryStats),
				paging: {
					page: action.page,
					to: action.to,
					objCount: action.objCount,
					pagesize: localConfig.pagesize
				}
			});

		case actionTypes.DOWNLOAD_STATS_PER_DATE_FETCHED:
			return update({
				statsGraph: new StatsGraph(action.dateUnit, action.downloadsPerDateUnit),
				dateUnit: action.dateUnit
			});

		case actionTypes.FILTERS:
			const dlFromValues =
				(action.dlfrom || [])
					.map(dl => ({id: dl.countryCode, count: dl.count, label: action.countryCodeLookup[dl.countryCode]}))
					.sort(labelSorter);
			const { stationCountryCodes, countryCodeLookup, stations} = action;
			const dataOriginCountryValues = stations.reduce((acc, station) => {
				const countryCode = (stationCountryCodes || [])[station.id];
				if (countryCode !== undefined) {
					const record = acc.find(st => st.id === countryCode);

					if (record) {
						record.count += station.count;
					} else {
						acc.push({ id: countryCode, count: station.count, label: countryCodeLookup[countryCode] });
					}
				}
				return acc;
			}, []).sort(labelSorter);

			return update({
				downloadStats: state.downloadStats.withStationCountryCodes(action.stationCountryCodes),
				countryCodeLookup,
				filters: [{
					name: "specification",
					values: action.specifications,
					displayFilterForSingleObject: false
				}, {
					name: "format",
					values: action.formats,
					displayFilterForSingleObject: false
				}, {
					name: "project",
					values: action.projects,
					displayFilterForSingleObject: false
				}, {
					name: "dataLevel",
					values: action.dataLevels,
					displayFilterForSingleObject: false
				}, {
					name: "stations",
					values: stations,
					displayFilterForSingleObject: false
				}, {
					name: "contributors",
					values: action.contributors,
					displayFilterForSingleObject: false
				}, {
					name: "themes",
					values: action.themes,
					displayFilterForSingleObject: false
				}, {
					name: "submitters",
					values: action.submitters,
					displayFilterForSingleObject: false
				}, {
					name: "dlfrom",
					values: dlFromValues,
					displayFilterForSingleObject: true
				}, {
					name: "dataOriginCountries",
					values: dataOriginCountryValues,
					displayFilterForSingleObject: false
				}, {
					name: "dlDates",
					values: new FilterTemporal(),
					displayFilterForSingleObject: true
				}]
			});

		case actionTypes.STATS_UPDATE:
			return update({
				downloadStats: state.downloadStats.withFilter(action.varName, action.values)
			});

		case actionTypes.DOWNLOAD_DATES_UPDATE:
			return update({
				downloadStats: state.downloadStats.withTemporalFilters(action.filterTemporal)
			});

		case actionTypes.GRAY_DOWNLOADS_UPDATE:
			return update({
				downloadStats: state.downloadStats.withGrayDownloadFilter(action.filterGrayDownload)
			});

		case actionTypes.SET_SPEC_PROJECT_LOOKUP:
			return update({
				specProjectLookup: action.specProjectLookup
			});

		case actionTypes.SET_SPEC_LEVEL_LOOKUP:
			return update({
				specLevelLookup: action.specLevelLookup
			});

		case actionTypes.RESET_FILTERS:
			return update({
				downloadStats: state.downloadStats.withoutFilter()
			});

		case actionTypes.STATS_UPDATED:
			return update({
				downloadStats: state.downloadStats.update(action.downloadStats, state.downloadStats.filters, 1),
				statsMap: state.statsMap.withCountryStats(action.countryStats),
				paging: {
					page: 1,
					to: action.to,
					objCount: action.objCount,
					pagesize: localConfig.pagesize
				}
			});

		case actionTypes.PREVIEW_DATA_FETCHED:
			const data = aggrResultFormatter[state.mainRadio.actionTxt](action.previewDataResult);
			const formattedData = { ...action.previewDataResult, ...{ data } };
			const previewData = filterPreviewData(state.subRadio, formattedData.data);
			const paging = getPreviewPaging(
				formattedData.data,
				previewData,
				formattedData._size,
				action.page,
				state.mainRadio,
				state.subRadio
			);

			return update({
				previewDataFull: formattedData.data,
				previewSize: formattedData._size,
				previewData,
				paging
			});

		case actionTypes.RADIO_CREATE:
			const radio = new Radio(action.radioConfig, action.radioAction);
			const radioName = action.isMain ? "mainRadio" : "subRadio";

			return update({
				[radioName]: radio
			});

		case actionTypes.RADIO_UPDATED:
			const partialState = state.view.mode === "previews"
				? updateRadiosAndPreviewData(state, action)
				: { mainRadio: state.mainRadio.withSelected(action.actionTxt) };

			return update(partialState);

		case actionTypes.VARIOUS_STATS_FETCHED:
			const variousStats = aggrResultFormatter[state.mainRadio.actionTxt](action.variousStats, state);

			return update({
				variousStats,
				paging: {
					page: action.page,
					to: action.variousStats._embedded.length,
					objCount: action.variousStats._size,
					pagesize: localConfig.pagesize
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

export const labelSorter = (a, b) => a.label.localeCompare(b.label);

const aggrResultFormatter = {
	getPopularTimeserieVars: (aggrResult) =>
		aggrResult._embedded.map(r => ({
			name: r.name,
			val: r.val,
			count: r.occurrences
		}))
	,
	getPreviewTimeserie: (aggrResult) =>
		aggrResult._embedded.map(r => ({
			...r, ...{
				hashId: r._id,
				x: r.x.sort((a, b) => a.count < b.count).map(x => x.name).join(', '),
				y: r.y.sort((a, b) => a.count < b.count).map(y => y.name).join(', ')
			}
		}))
	,
	getPreviewNetCDF: (aggrResult) =>
		aggrResult._embedded.map(r => ({
			...r, ...{
				hashId: r._id,
				variables: r.variables.sort((a, b) => a.count < b.count).map(variable => variable.name).join(', ')
			}
		}))
	,
	getPreviewMapGraph: (aggrResult) =>
		aggrResult._embedded.map(r => ({
			...r, ...{
				hashId: r._id,
				mapView: r.mapView.sort((a, b) => a.count < b.count).map(mapView => mapView.name).join(', '),
				y1: r.y1.sort((a, b) => a.count < b.count).map(y1 => y1.name).join(', '),
				y2: r.y2.sort((a, b) => a.count < b.count).map(y2 => y2.name).join(', ')
			}
		}))
	,
	getLibDownloadsByDobj: (aggrResult) =>
		aggrResult._embedded.map(r => ({
			objId: r._id,
			fileName: r.fileName,
			count: r.count
		}))
	,
	getLibDownloadsByCountry: (aggrResult, state) =>
		aggrResult._embedded.map(r => ({
			val: state.countryCodeLookup[r._id] ?? "Unknown but likely from local server",
			count: r.count
		}))
	,
	getLibDownloadsByVersion: (aggrResult) =>
		aggrResult._embedded.map(r => ({
			val: r._id,
			count: r.count
		}))
};

const updateRadiosAndPreviewData = (state, action) => {
	const radioName = action.isMain ? "mainRadio" : "subRadio";
	const newRadio = state[radioName].withSelected(action.actionTxt);
	const previewData = action.radioConfig.name === "mainPreview"
		? state.previewData
		: filterPreviewData(newRadio, state.previewDataFull);
	const mainRadio = radioName === "mainRadio" ? newRadio : state.mainRadio;
	const subRadio = radioName === "subRadio"
		? newRadio
		: mainRadio.selected.parentTo === state.subRadio.name
			? state.subRadio.setActive()
			: state.subRadio.setInactive();

	const paging = getPreviewPaging(
		state.previewDataFull,
		previewData,
		state.previewSize,
		state.paging.page,
		state.mainRadio,
		state.subRadio
	);

	return {
		mainRadio,
		subRadio,
		previewData,
		paging
	};
};

const getPreviewPaging = (previewDataFull, previewData, previewSize, page, mainRadio, subRadio) => {
	const adjustPaging = mainRadio.selected.parentTo === subRadio.name;
	const [to, objCount] = adjustPaging
		? [previewData.length, previewData.length]
		: [previewDataFull.length, previewSize];

	return {
		page,
		to,
		objCount,
		pagesize: localConfig.pagesize
	};
};

const filterPreviewData = (radio, statData) => {
	if (!radio.isActive) return statData;

	const selectedRadio = radio && radio.radios && radio.radios.length
		? radio.selected
		: undefined;

	return selectedRadio
		? statData.filter(d => d.name === selectedRadio.actionTxt)
		: statData;
};
