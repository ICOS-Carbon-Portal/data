import { actionTypes } from './actions';
import * as Toaster from 'icos-cp-toaster';
import StatsTable from './models/StatsTable';
import StatsGraph from './models/StatsGraph';
import BackendSource from "./models/BackendSource";
import ViewMode from "./models/ViewMode";
import StatsMap from "./models/StatsMap";
import {RadioConfig} from "./models/RadioConfig";
import localConfig from './config';


export const initState = {
	backendSource: new BackendSource(),
	view: new ViewMode(),
	downloadStats: new StatsTable({}),
	statsMap: new StatsMap(),
	statsGraph: new StatsGraph(),
	countryCodesLookup: undefined,
	paging: {
		page: 0,
		to: 0,
		objCount: 0,
		pagesize: localConfig.pagesize
	},
	dateUnit: 'week'
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
		
		case actionTypes.COUNTRY_CODES_FETCHED:
			return update({ countryCodesLookup: action.countryCodesLookup });

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
			const dlFromValues = state.backendSource.source === 'restheart'
				? action.countryCodes
				: (action.dlfrom || [])
					.map(dl => ({id: dl.countryCode, count: dl.count, label: action.countryCodeLookup[dl.countryCode]}))
					.sort((a, b) => a.label.localeCompare(b.label));
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
			}, []).sort((a, b) => a.label.localeCompare(b.label));
			
			return update({
				stationCountryCodeLookup: action.stationCountryCodeLookup,
				downloadStats: state.downloadStats.withStationCountryCodes(action.stationCountryCodes),
				countryCodeLookup,
				filters: [{
					name: "specification",
					values: action.specifications
				}, {
					name: "format",
					values: action.formats
				}, {
					name: "dataLevel",
					values: action.dataLevels
				}, {
					name: "stations",
					values: stations
				}, {
					name: "contributors",
					values: action.contributors
				}, {
					name: "themes",
					values: action.themes
				}, {
					name: "submitters",
					values: action.submitters
				}, {
					name: "dlfrom",
					values: dlFromValues
				}, {
					name: "dataOriginCountries",
					values: dataOriginCountryValues
				}]
			});

		case actionTypes.STATS_UPDATE:
			return update({
				downloadStats: state.downloadStats.withFilter(action.varName, action.values)
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
			const data = action.previewDataResult.data.map(d => ({ ...d, ...{ hashId: d._id } }));
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
				lastPreviewCall: action.fetchFn,
				previewDataFull: formattedData.data,
				previewSize: formattedData._size,
				previewData,
				paging
			});

		case actionTypes.RADIO_CREATE:
			const radio = new RadioConfig(action.radioConfig, action.radioAction);
			const name = action.radioConfig.name === "main" ? "mainRadio" : "subRadio";

			return update({
				[name]: radio
			});

		case actionTypes.RADIO_UPDATED:
			return update(updateRadiosAndPreviewData(state, action));
		
		case actionTypes.SET_BACKEND_SOURCE:
			const newBackendSource = new BackendSource(action.source);

			return { ...initState, ...{ backendSource: newBackendSource } };
		
		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

const updateRadiosAndPreviewData = (state, action) => {
	const radioName = action.radioConfig.name === "main" ? "mainRadio" : "subRadio";
	const newRadio = state[radioName].withSelected(action.actionTxt);
	const previewData = action.radioConfig.name === "main"
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

const filterPreviewData = (radio, previewData) => {
	if (!radio.isActive) return previewData;

	const selectedRadio = radio && radio.radios && radio.radios.length
		? radio.selected
		: undefined;

	return selectedRadio
		? previewData.filter(d => d.name === selectedRadio.actionTxt)
		: previewData;
};
