import {ERROR, COUNTRIES_FETCHED, DOWNLOAD_STATS_FETCHED, FILTERS, STATS_UPDATE, STATS_UPDATED,
	DOWNLOAD_STATS_PER_DATE_FETCHED, SET_VIEW_MODE,
	RADIO_CREATE, PREVIEW_DATA_FETCHED, RADIO_UPDATED} from './actions';
import * as Toaster from 'icos-cp-toaster';
import StatsTable from './models/StatsTable';
import StatsGraph from './models/StatsGraph';
import ViewMode from "./models/ViewMode";
import StatsMap from "./models/StatsMap";
import {RadioConfig} from "./models/RadioConfig";
import localConfig from './config';


export const initState = {
	view: new ViewMode(),
	downloadStats: new StatsTable({}),
	statsMap: new StatsMap(),
	statsGraph: new StatsGraph(),
	paging: {
		offset: 0,
		to: 0,
		objCount: 0,
		pagesize: localConfig.pagesize
	},
	dateUnit: 'week'
};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case SET_VIEW_MODE:
			return update({
				view: state.view.setMode(action.mode),
				statsGraph: {},
				dateUnit: initState.dateUnit
			});

		case COUNTRIES_FETCHED:
			return update({statsMap: state.statsMap.withCountriesTopo(action.countriesTopo)});

		case DOWNLOAD_STATS_FETCHED:
			return update({
				downloadStats: new StatsTable(action.downloadStats._embedded, action.filters),
				statsMap: state.statsMap.withCountryStats(action.countryStats._embedded),
				paging: {
					offset: action.page,
					to: action.downloadStats._returned,
					objCount: action.downloadStats._size,
					pagesize: localConfig.pagesize
				}
			});

		case DOWNLOAD_STATS_PER_DATE_FETCHED:
			return update({
				statsGraph: new StatsGraph(action.dateUnit, action.downloadsPerDateUnit),
				dateUnit: action.dateUnit
			});

		case FILTERS:
			return update({
				filters: [{
					name: "specification",
					values: action.specifications._embedded
				}, {
					name: "format",
					values: action.formats._embedded
				}, {
					name: "dataLevel",
					values: action.dataLevels._embedded
				}, {
					name: "stations",
					values: action.stations._embedded
				}, {
					name: "contributors",
					values: action.contributors._embedded
				}, {
					name: "themes",
					values: action.themes._embedded
				}, {
					name: "countryCodes",
					values: action.countryCodes
				}]
			});

		case STATS_UPDATE:
			return update({
				downloadStats: state.downloadStats.withFilter(action.varName, action.values)
			});

		case STATS_UPDATED:
			return update({
				downloadStats: new StatsTable(action.downloadStats._embedded, state.downloadStats.filters),
				statsMap: state.statsMap.withCountryStats(action.countryStats._embedded),
				paging: {
					offset: 1,
					to: action.downloadStats._returned,
					objCount: action.downloadStats._size,
					pagesize: localConfig.pagesize
				}
			});

		case PREVIEW_DATA_FETCHED:
			const formattedData = action.formatter(action.previewDataResult);
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
				lastPreviewCall: {
					fetchFn: action.fetchFn,
					formatter: action.formatter
				},
				previewDataFull: formattedData.data,
				previewSize: formattedData._size,
				previewData,
				paging
			});

		case RADIO_CREATE:
			const radio = new RadioConfig(action.radioConfig, action.radioAction);
			const name = action.radioConfig.name === "main" ? "mainRadio" : "subRadio";

			return update({
				[name]: radio
			});

		case RADIO_UPDATED:
			return update(updateRadiosAndPreviewData(state, action));

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
		state.paging.offset,
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

const getPreviewPaging = (previewDataFull, previewData, previewSize, offset, mainRadio, subRadio) => {
	const adjustPaging = mainRadio.selected.parentTo === subRadio.name;
	const [to, objCount] = adjustPaging
		? [previewData.length, previewData.length]
		: [previewDataFull.length, previewSize];

	return {
		offset,
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

export const formatTimeserieData = previewTimeserie => {
	const data = previewTimeserie._embedded.map(dobj => {
		return Object.assign(dobj, {
			x: dobj.x.sort((a, b) => a.count < b.count).map(x => x.name).join(', '),
			y: dobj.y.sort((a, b) => a.count < b.count).map(y => y.name).join(', ')
		})
	});

	return {
		data,
		_size: previewTimeserie._size,
		_returned: previewTimeserie._returned
	}
};

export const formatNetCDFData = previewNetCDF => {
	const data = previewNetCDF._embedded.map(dobj => {
		return Object.assign(dobj, {
			variables: dobj.variables.sort((a, b) => a.count < b.count).map(variable => variable.name).join(', ')
		})
	});

	return {
		data,
		_size: previewNetCDF._size,
		_returned: previewNetCDF._returned
	}
};

export const formatPopularTimeserieVars = popularTimeserieVars => {
	const data = popularTimeserieVars._embedded.map(p => {
		return {
			name: p.name,
			val: p.val,
			count: p.occurrences
		};
	});

	return {
		data,
		_size: popularTimeserieVars._size,
		_returned: popularTimeserieVars._returned
	}
};
