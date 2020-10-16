import {actionTypes} from './actions';
import {Control, ControlColorRamp} from './models/ControlsHelper';
import {colorRamps, ColorMakerRamps} from '../../common/main/models/ColorMaker';
import RasterDataFetcher from './models/RasterDataFetcher';
import * as Toaster from 'icos-cp-toaster';
import {defaultRangeFilter} from "./store";

export default function(state, action){

	switch(action.type){

		case actionTypes.ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});
		
		case actionTypes.METADATA_FETCHED:
			return update({
				metadata: action.metadata,
				legendLabel: getLegendLabel(getVariableInfo(state.controls, action.metadata)),
				variableEnhancer: getVariables(action.metadata)
			})

		case actionTypes.COUNTRIES_FETCHED:
			return update({
				countriesTopo: {
					ts: Date.now(),
					data: action.countriesTopo
				}
			});

		case actionTypes.SERVICES_FETCHED:
			return update({
				controls: state.controls.withServices(new Control(action.services))
			});

		case actionTypes.SERVICE_SET:
			return update({
				controls: state.controls.withServices(new Control(action.services, 0))
			});

		case actionTypes.SERVICE_SELECTED:
			return update({
				controls: state.controls.withSelectedService(action.idx),
				timeserieParams: undefined
			});

		case actionTypes.TITLE_FETCHED:
			return update({
				title: action.title
			});

		case actionTypes.VARIABLES_AND_DATES_FETCHED:
			if (isFetched(state, action)){
				const vIdx = action.variables.indexOf(state.initSearchParams.varName);
				const dIdx = action.dates.indexOf(state.initSearchParams.date);

				const controls = state.controls
					.withVariables(new Control(action.variables, vIdx))
					.withDates(new Control(action.dates, dIdx));

				return update({
					controls,
					legendLabel: getLegendLabel(getVariableInfo(controls, state.metadata))
				});
			} else {
				return state;
			}

		case actionTypes.ELEVATIONS_FETCHED:
			if (isElevationsFetched(state, action)) {
				const elevations = filterElevations(action.elevations);
				const eIdx = elevations.length
					? state.lastElevation
						? elevations.indexOf(state.lastElevation)
						: state.initSearchParams.elevation
							? elevations.indexOf(state.initSearchParams.elevation)
							: -1
					: -1;
				const elevationCtrl = state.controls.withElevations(new Control(elevations, eIdx));

				return update({
					lastElevation: eIdx >= 0 ? elevations[eIdx] : state.lastElevation,
					controls: elevationCtrl,
					rasterDataFetcher: new RasterDataFetcher(getDataObjectVariables(elevationCtrl))
				});
			} else {
				return state;
			}

		case actionTypes.VARIABLE_SELECTED:
			const newControls = state.controls.withSelectedVariable(action.idx);

			return update({
				rangeFilter: defaultRangeFilter,
				controls: newControls,
				legendLabel: getLegendLabel(getVariableInfo(newControls, state.metadata)),
				isDivergingData: undefined
			});

		case actionTypes.DATE_SELECTED:
			return update({controls: state.controls.withSelectedDate(action.idx)});

		case actionTypes.ELEVATION_SELECTED:
			return update({
				lastElevation: state.controls.elevations.values[action.idx],
				controls: state.controls.withSelectedElevation(action.idx)
			});

		case actionTypes.DELAY_SELECTED:
			const delayCtrls = state.controls.withSelectedDelay(action.idx);
			const rasterDataFetcher = new RasterDataFetcher(
				getDataObjectVariables(delayCtrls),
				{
					delay: delayCtrls.delays.selected
				}
			);

			return update({
				controls: delayCtrls,
				rasterDataFetcher
			});
		
		case actionTypes.SET_RANGEFILTER:
			minMax = getMinMax(state.controls, state.metadata, state.raster, action.rangeFilter);
			colorMaker = new ColorMakerRamps(minMax.min, minMax.max, state.controls.gammas.selected, state.controls.colorRamps.selected, state.isDivergingData);
			controlColorRamp = new ControlColorRamp(colorMaker.colorRamps, colorMaker.colorRampIdx);
			return update({
				rangeFilter: action.rangeFilter,
				minMax,
				colorMaker,
				controls: state.controls.withColorRamps(controlColorRamp)
			})

		case actionTypes.RASTER_FETCHED:
			const rangeFilterMinMax = getRangeFilterMinMax(state.rangeFilter);
			const globalMinMax = getGlobalMinMax(state.controls, state.metadata);
			const rasterMinMax = getRasterMinMax(action.raster);

			let minMax = selectMinMax(rangeFilterMinMax, globalMinMax, rasterMinMax);
			const isDivergingData = state.isDivergingData === undefined
				? minMax.min < 0 && minMax.max > 0
				: state.isDivergingData;
		
			let colorMaker = new ColorMakerRamps(minMax.min, minMax.max, state.controls.gammas.selected, state.controls.colorRamps.selected, isDivergingData);
			let controlColorRamp = new ControlColorRamp(colorMaker.colorRamps, colorMaker.colorRampIdx);

			return isRasterFetched(state, action)
				? update({
					minMax,
					fullMinMax: selectMinMax({}, globalMinMax, rasterMinMax),
					rasterFetchCount: state.rasterFetchCount + 1,
					raster: action.raster,
					colorMaker,
					controls: state.controls.withColorRamps(controlColorRamp),
					isDivergingData
				})
				: state;

		case actionTypes.GAMMA_SELECTED:
			const newGammaControls = state.controls.withSelectedGamma(action.idx);
			const selectedGamma = newGammaControls.gammas.selected;
			minMax = getMinMax(state.controls, state.metadata, state.raster, state.rangeFilter);
			colorMaker = state.raster
				? new ColorMakerRamps(minMax.min, minMax.max, selectedGamma, state.colorMaker.colorRampName, state.isDivergingData)
				: state.colorMaker;
			controlColorRamp = colorMaker
				? new ControlColorRamp(colorMaker.colorRamps, newGammaControls.selectedIdxs.colorRampIdx)
				: undefined;

			return update({
				colorMaker,
				controls: newGammaControls.withColorRamps(controlColorRamp)
			});

		case actionTypes.COLORRAMP_SELECTED:
			const selectedColorRamp = state.colorMaker
				? state.colorMaker.colorRamps[action.idx].name
				: colorRamps[action.idx].name;
			minMax = getMinMax(state.controls, state.metadata, state.raster, state.rangeFilter);
			colorMaker = state.raster
				? new ColorMakerRamps(minMax.min, minMax.max, state.controls.gammas.selected, selectedColorRamp, state.isDivergingData)
				: state.colorMaker;
			controlColorRamp = colorMaker
				? new ControlColorRamp(colorMaker.colorRamps, action.idx)
				: undefined;

			return update({
				colorMaker,
				controls: state.controls
					.withColorRamps(controlColorRamp)
					.withSelectedColorRamp(action.idx)
			});

		case actionTypes.FETCHING_TIMESERIE:
			return update({
				isFetchingTimeserieData: true,
				timeserieData: []
			});

		case actionTypes.TIMESERIE_FETCHED:
			return update({
				isFetchingTimeserieData: false,
				timeserieData: getTimeserieData(state.controls.dates.values, action.yValues),
				timeserieParams: action.timeserieParams,
				latlng: {
					lat: action.timeserieParams.latlng.lat.toFixed(3),
					lng: action.timeserieParams.latlng.lng.toFixed(3)
				}
			});

		case actionTypes.TIMESERIE_RESET:
			return update({
				timeserieData: [],
				timeserieParams: undefined
			});

		case actionTypes.TOGGLE_TS_SPINNER:
			return update({
				showTSSpinner: action.showTSSpinner
			});

		case actionTypes.PUSH_PLAY:
			const playingMovie = !state.playingMovie;
			const did = playingMovie
				? state.rasterDataFetcher.getDesiredId(state.controls.selectedIdxs)
				: state.desiredId;
			return update({playingMovie, desiredId: did});

		case actionTypes.INCREMENT_RASTER:
			const controls = state.controls.withIncrementedDate(action.increment);
			const desiredId = state.rasterDataFetcher.getDesiredId(controls.selectedIdxs);

			return state.raster
				? update({controls, desiredId})
				: state;

		default:
			return state;
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

const getMinMax = (controls, metadata, raster, rangeFilter) => {
	const rangeFilterMinMax = getRangeFilterMinMax(rangeFilter);
	if (rangeFilterMinMax.min !== undefined && rangeFilterMinMax.max !== undefined) return rangeFilterMinMax;

	if (metadata === undefined && raster === undefined) return rangeFilterMinMax;

	const globalMinMax = getGlobalMinMax(controls, metadata);
	const rasterMinMax = getRasterMinMax(raster);

	return selectMinMax(rangeFilterMinMax, globalMinMax, rasterMinMax);
};

const selectMinMax = (rangeFilterMinMax, globalMinMax, rasterMinMax) => {
	const pickVal = (key, rangeFilter, global, raster) => {
		if (rangeFilter[key] !== undefined) return rangeFilter[key];

		if (global[key] !== undefined) return global[key];

		return raster[key];
	};

	return {
		min: pickVal('min', rangeFilterMinMax, globalMinMax, rasterMinMax),
		max: pickVal('max', rangeFilterMinMax, globalMinMax, rasterMinMax)
	};
};

const getVariableInfo = (controls, metadata) => {
	if (controls === undefined) return;

	const selectedVariable = controls.variables.selected;
	if (selectedVariable === undefined) return;

	const metadataVariables = metadata ? metadata.specificInfo.variables : undefined;
	if (metadataVariables === undefined) return;

	return metadataVariables.find(v => v.label === selectedVariable);
};

const getGlobalMinMax = (controls, metadata) => {
	const variableInfo = getVariableInfo(controls, metadata);

	if (variableInfo === undefined || variableInfo.minMax === undefined) return { min: undefined, max: undefined };

	const [min, max] = variableInfo.minMax;
	return { min, max };
};

const getRangeFilterMinMax = (rangeFilter) => {
	return { min: rangeFilter.rangeValues.minRange, max: rangeFilter.rangeValues.maxRange };
};

const getRasterMinMax = (raster) => {
	if (raster === undefined || raster.stats === undefined) return { min: undefined, max: undefined };

	return {
		min: raster.stats.min,
		max: raster.stats.max
	}
};

const getLegendLabel = (metadataVariable) => {
	if (metadataVariable && metadataVariable.valueType && metadataVariable.valueType.self && metadataVariable.valueType.self.label && metadataVariable.valueType.unit) {
		return `${metadataVariable.valueType.self.label} [${metadataVariable.valueType.unit}]`;
	}

	return 'Legend';
};

const getVariables = (metadata) => {
	if (metadata && metadata.specificInfo && metadata.specificInfo.variables)
		return metadata.specificInfo.variables.reduce((acc, v) => {
			acc[v.label] = `${v.valueType.self.label} (${v.label})`;
			return acc;
		}, {});
};

const getTimeserieData = (dates, yValues) => {
	return dates.length === yValues.length
		? dates.map((date, idx) => [new Date(date), yValues[idx]])
		: [[0, 1]];
};

function filterElevations(elevations){
	//TODO: Remove this when backend filters elevations
	return elevations.length === 1 && elevations[0] === "null"
		? []
		: Array.from(new Set(elevations));
}

function isFetched(state, action){
	return action.service === state.controls.services.selected;
}

function isElevationsFetched(state, action){
	return action.controls.services.selected === state.controls.services.selected
		&& action.controls.variables.selected === state.controls.variables.selected;
}

function isRasterFetched(state, action){
	return action.controls.services.selected === state.controls.services.selected &&
		action.controls.variables.selected === state.controls.variables.selected &&
		action.controls.dates.selected === state.controls.dates.selected &&
		action.controls.elevations.selected === state.controls.elevations.selected;
}

function getDataObjectVariables(controls){
	return {
		dates: controls.dates.values,
		elevations: controls.elevations.values,
		gammas: controls.gammas.values,
		services: controls.services.values,
		variables: controls.variables.values
	};
}
