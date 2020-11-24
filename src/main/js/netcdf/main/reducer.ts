import {
	COLORRAMP_SELECTED, COUNTRIES_FETCHED, DATE_SELECTED, DELAY_SELECTED, ELEVATIONS_FETCHED, ELEVATION_SELECTED,
	ERROR, FETCHING_TIMESERIE, GAMMA_SELECTED, INCREMENT_RASTER, METADATA_FETCHED, NetCDFPlainAction, PUSH_PLAY,
	RASTER_FETCHED, SERVICES_FETCHED, SERVICE_SELECTED, SERVICE_SET, SET_RANGEFILTER, TIMESERIE_FETCHED,
	TIMESERIE_RESET, TITLE_FETCHED, TOGGLE_TS_SPINNER, VARIABLES_AND_DATES_FETCHED, VARIABLE_SELECTED
} from './actionDefinitions';
import {Control, ControlColorRamp, ControlsHelper} from './models/ControlsHelper';
import {colorRamps, ColorMakerRamps} from '../../common/main/models/ColorMaker';
import RasterDataFetcher from './models/RasterDataFetcher';
import * as Toaster from 'icos-cp-toaster';
import stateProps, { MinMax, RangeFilter, State, TimeserieData, VariableInfo } from './models/State';
import { Obj } from '../../common/main/types';
import { DataObject, L3SpecificMeta, L3VarInfo } from '../../common/main/metacore';
import { BinRasterExtended } from './models/BinRasterExtended';


export default function (state = stateProps.defaultState, action: NetCDFPlainAction) {
	const payload = action.payload;

	if (payload instanceof ERROR) {
		return update({
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	if (payload instanceof METADATA_FETCHED) {
		return update({
			metadata: payload.metadata,
			legendLabel: getLegendLabel(getVariableInfo(state.controls, payload.metadata)),
			variableEnhancer: getVariables(payload.metadata)
		});
	}

	if (payload instanceof COUNTRIES_FETCHED) {
		return update({
			countriesTopo: {
				ts: Date.now(),
				data: payload.countriesTopo
			}
		});
	}

	if (payload instanceof SERVICES_FETCHED) {
		return update({
			controls: state.controls.withServices(new Control(payload.services))
		});
	}

	if (payload instanceof SERVICE_SET) {
		return update({
			controls: state.controls.withServices(new Control(payload.services))
		});
	}

	if (payload instanceof SERVICE_SELECTED) {
		return update({
			controls: state.controls.withSelectedService(payload.idx),
			timeserieParams: undefined
		});
	}

	if (payload instanceof TITLE_FETCHED) {
		return update({
			title: payload.title
		});
	}

	if (payload instanceof VARIABLES_AND_DATES_FETCHED) {
		if (isFetched(state, payload)) {
			const vIdx = payload.variables.indexOf(state.initSearchParams.varName);
			const dIdx = payload.dates.indexOf(state.initSearchParams.date);

			const controls = state.controls
				.withVariables(new Control(payload.variables, vIdx))
				.withDates(new Control(payload.dates, dIdx));

			return update({
				controls,
				legendLabel: getLegendLabel(getVariableInfo(controls, state.metadata))
			});
		} else {
			return state;
		}
	}

	if (payload instanceof ELEVATIONS_FETCHED) {
		if (isElevationsFetched(state, payload)) {
			const elevations = filterElevations(payload.elevations);
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
	}

	if (payload instanceof VARIABLE_SELECTED) {
		const newControls = state.controls.withSelectedVariable(payload.idx);

		return update({
			rangeFilter: stateProps.defaultRangeFilter,
			controls: newControls,
			legendLabel: getLegendLabel(getVariableInfo(newControls, state.metadata)),
			isDivergingData: undefined
		});
	}

	if (payload instanceof DATE_SELECTED) {
		return update({ controls: state.controls.withSelectedDate(payload.idx) });
	}

	if (payload instanceof ELEVATION_SELECTED) {
		return update({
			lastElevation: state.controls.elevations.values[payload.idx],
			controls: state.controls.withSelectedElevation(payload.idx)
		});
	}

	if (payload instanceof DELAY_SELECTED) {
		const delayCtrls = state.controls.withSelectedDelay(payload.idx);
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
	}

	if (payload instanceof SET_RANGEFILTER) {
		return update(handleSetRangefilter(state, payload));
	}

	if (payload instanceof RASTER_FETCHED) {
		return update(handleRasterFetched(state, payload));
	}

	if (payload instanceof GAMMA_SELECTED) {
		return update(handleGammaSelected(state, payload));
	}

	if (payload instanceof COLORRAMP_SELECTED) {
		return update(handleColorrampSelected(state, payload));
	}

	if (payload instanceof FETCHING_TIMESERIE) {
		return update({
			isFetchingTimeserieData: true,
			timeserieData: []
		});
	}

	if (payload instanceof TIMESERIE_FETCHED) {
		return update({
			isFetchingTimeserieData: false,
			timeserieData: getTimeserieData(state.controls.dates.values, payload.yValues),
			timeserieParams: payload.timeserieParams,
			latlng: payload.timeserieParams.latlng
			// latlng: {
			// 	lat: payload.timeserieParams.latlng.lat.toFixed(3),
			// 	lng: payload.timeserieParams.latlng.lng.toFixed(3)
			// }
		});
	}

	if (payload instanceof TIMESERIE_RESET) {
		return update({
			timeserieData: [],
			timeserieParams: undefined
		});
	}

	if (payload instanceof TOGGLE_TS_SPINNER) {
		return update({
			showTSSpinner: payload.showTSSpinner
		});
	}

	if (payload instanceof PUSH_PLAY) {
		const playingMovie = !state.playingMovie;
		const did = playingMovie
			? state.rasterDataFetcher!.getDesiredId(state.controls.selectedIdxs)
			: state.desiredId;
		return update({ playingMovie, desiredId: did });
	}

	if (payload instanceof INCREMENT_RASTER) {
		const controls = state.controls.withIncrementedDate(payload.increment);
		const desiredId = state.rasterDataFetcher!.getDesiredId(controls.selectedIdxs);

		return state.raster
			? update({ controls, desiredId })
			: state;
	}

	return state;

	function update(updates: Partial<State>): State{
		return { ...state, ...updates };
	}
}

type HandleAction<A> = (state: State, payload: A) => Partial<State>

const handleSetRangefilter: HandleAction<SET_RANGEFILTER> = (state, payload) => {
	const minMax = getMinMax(state.controls, payload.rangeFilter, state.metadata, state.raster);
	const colorMaker = new ColorMakerRamps(minMax.min, minMax.max, state.controls.gammas.selected, state.controls.colorRamps.selected, state.isDivergingData);
	const controlColorRamp = new ControlColorRamp(colorMaker.colorRamps, colorMaker.colorRampIdx);
	
	return {
		rangeFilter: payload.rangeFilter,
		minMax,
		colorMaker,
		controls: state.controls.withColorRamps(controlColorRamp)
	};
};

const handleRasterFetched: HandleAction<RASTER_FETCHED> = (state, payload) => {
	const rangeFilterMinMax = getRangeFilterMinMax(state.rangeFilter);
	const globalMinMax = getGlobalMinMax(state.controls, state.metadata);
	const rasterMinMax = getRasterMinMax(payload.raster);

	const minMax = selectMinMax(rangeFilterMinMax, globalMinMax, rasterMinMax);
	const isDivergingData = state.isDivergingData === undefined
		? minMax.min < 0 && minMax.max > 0
		: state.isDivergingData;

	const colorMaker = new ColorMakerRamps(minMax.min, minMax.max, state.controls.gammas.selected, state.controls.colorRamps.selected, isDivergingData);
	const controlColorRamp = new ControlColorRamp(colorMaker.colorRamps, colorMaker.colorRampIdx);

	return isRasterFetched(state, payload)
		? {
			minMax,
			fullMinMax: selectMinMax({}, globalMinMax, rasterMinMax),
			rasterFetchCount: state.rasterFetchCount + 1,
			raster: payload.raster,
			colorMaker,
			controls: state.controls.withColorRamps(controlColorRamp),
			isDivergingData
		}
		: state;
};

const handleGammaSelected: HandleAction<GAMMA_SELECTED> = (state, payload) => {
	const newGammaControls = state.controls.withSelectedGamma(payload.idx);
	const selectedGamma = newGammaControls.gammas.selected;
	const minMax = getMinMax(state.controls, state.rangeFilter, state.metadata, state.raster);
	const colorMaker = state.raster && state.colorMaker && state.colorMaker
		? new ColorMakerRamps(minMax.min, minMax.max, selectedGamma, (state.colorMaker as ColorMakerRamps).colorRampName, state.isDivergingData)
		: state.colorMaker;
	const controlColorRamp = colorMaker
		? new ControlColorRamp((colorMaker as ColorMakerRamps).colorRamps, newGammaControls.selectedIdxs.colorRampIdx)
		: undefined;

	return {
		colorMaker,
		controls: newGammaControls.withColorRamps(controlColorRamp)
	};
};

const handleColorrampSelected: HandleAction<COLORRAMP_SELECTED> = (state, payload) => {
	const selectedColorRamp = state.colorMaker
		? (state.colorMaker as ColorMakerRamps).colorRamps[payload.idx].name
		: colorRamps[payload.idx].name;
	const minMax = getMinMax(state.controls, state.rangeFilter, state.metadata, state.raster);
	const colorMaker = state.raster
		? new ColorMakerRamps(minMax.min, minMax.max, state.controls.gammas.selected, selectedColorRamp, state.isDivergingData)
		: state.colorMaker;
	const controlColorRamp = colorMaker
		? new ControlColorRamp((colorMaker as ColorMakerRamps).colorRamps, payload.idx)
		: undefined;

	return {
		colorMaker,
		controls: state.controls
			.withColorRamps(controlColorRamp)
			.withSelectedColorRamp(payload.idx)
	};
};

const getMinMax = (controls: ControlsHelper, rangeFilter: RangeFilter, metadata?: DataObject, raster?: BinRasterExtended): Partial<MinMax> => {
	const rangeFilterMinMax = getRangeFilterMinMax(rangeFilter);
	if (rangeFilterMinMax.min !== undefined && rangeFilterMinMax.max !== undefined) return rangeFilterMinMax as MinMax;

	if (metadata === undefined && raster === undefined) return rangeFilterMinMax;

	const globalMinMax = getGlobalMinMax(controls, metadata);
	const rasterMinMax = getRasterMinMax(raster);

	return selectMinMax(rangeFilterMinMax, globalMinMax, rasterMinMax);
};

const selectMinMax = (rangeFilterMinMax: Partial<MinMax>, globalMinMax: Partial<MinMax>, rasterMinMax: Partial<MinMax>) => {
	const pickVal = (key: 'min' | 'max', rangeFilter: Partial<MinMax>, global: Partial<MinMax>, raster: Partial<MinMax>) => {
		if (rangeFilter[key] !== undefined) return rangeFilter[key]!;

		if (global[key] !== undefined) return global[key]!;

		return raster[key]!;
	};

	return {
		min: pickVal('min', rangeFilterMinMax, globalMinMax, rasterMinMax),
		max: pickVal('max', rangeFilterMinMax, globalMinMax, rasterMinMax)
	};
};

const getVariableInfo = (controls?: ControlsHelper, metadata?: DataObject) => {
	if (controls === undefined) return;

	const selectedVariable = controls.variables.selected;
	if (selectedVariable === undefined) return;

	const metadataVariables = metadata ? (metadata.specificInfo as L3SpecificMeta).variables : undefined;
	if (metadataVariables === undefined) return;

	return metadataVariables.find((v: L3VarInfo) => v.label === selectedVariable) as VariableInfo | undefined;
};

const getGlobalMinMax = (controls?: ControlsHelper, metadata?: DataObject) => {
	const variableInfo = getVariableInfo(controls, metadata);

	if (variableInfo === undefined || variableInfo.minMax === undefined) return { min: undefined, max: undefined };

	const [min, max] = variableInfo.minMax;
	return { min, max };
};

const getRangeFilterMinMax = (rangeFilter: RangeFilter) => {
	return { min: rangeFilter.rangeValues.minRange, max: rangeFilter.rangeValues.maxRange };
};

const getRasterMinMax = (raster?: BinRasterExtended) => {
	if (raster === undefined || raster.stats === undefined) return { min: undefined, max: undefined };

	return {
		min: raster.stats.min,
		max: raster.stats.max
	}
};

const getLegendLabel = (metadataVariable?: VariableInfo) => {
	if (metadataVariable && metadataVariable.valueType && metadataVariable.valueType.self && metadataVariable.valueType.self.label && metadataVariable.valueType.unit) {
		return `${metadataVariable.valueType.self.label} [${metadataVariable.valueType.unit}]`;
	}

	return 'Legend';
};

const getVariables = (metadata?: DataObject) => {
	const specificInfo = metadata && metadata.specificInfo as L3SpecificMeta | undefined ;

	if (specificInfo && specificInfo.variables)
		return specificInfo.variables.reduce((acc: Obj, v: L3VarInfo) => {
			acc[v.label] = `${v.valueType.self.label} (${v.label})`;
			return acc;
		}, {});
};

const getTimeserieData = (dates: string[], yValues: number[]): TimeserieData[] => {
	return dates.length === yValues.length
		? dates.map((date: string, idx: number) => [new Date(date), yValues[idx]])
		: [[0, 1]];
};

function filterElevations(elevations: string[]){
	//TODO: Remove this when backend filters elevations
	return elevations.length === 1 && elevations[0] === "null"
		? []
		: Array.from(new Set(elevations));
}

function isFetched(state: State, payload: VARIABLES_AND_DATES_FETCHED){
	return payload.service === state.controls.services.selected;
}

function isElevationsFetched(state: State, payload: ELEVATIONS_FETCHED){
	return payload.controls.services.selected === state.controls.services.selected
		&& payload.controls.variables.selected === state.controls.variables.selected;
}

function isRasterFetched(state: State, payload: RASTER_FETCHED){
	return payload.controls.services.selected === state.controls.services.selected &&
		payload.controls.variables.selected === state.controls.variables.selected &&
		payload.controls.dates.selected === state.controls.dates.selected &&
		payload.controls.elevations.selected === state.controls.elevations.selected;
}

function getDataObjectVariables(controls: ControlsHelper){
	return {
		dates: controls.dates.values,
		elevations: controls.elevations.values,
		gammas: controls.gammas.values,
		services: controls.services.values,
		variables: controls.variables.values
	};
}
