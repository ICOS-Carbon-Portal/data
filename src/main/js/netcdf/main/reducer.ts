import {Control, ColormapControl, ControlsHelper, defaultGammas, defaultControl} from './models/ControlsHelper';
import * as Toaster from 'icos-cp-toaster';
import stateProps, { MinMax, RangeFilter, TimeserieData, TimeserieParams } from './models/State';
import { DataObject, SpatioTemporalMeta, StationTimeSeriesMeta, VarMeta } from '../../common/main/metacore';
import { BinRaster } from 'icos-cp-backend';
import { colorMaps } from './models/Colormap';
import { RGBA } from 'icos-cp-spatial';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VariableInfo } from './backend';

type CountriesFetchedPayload = {
	timestamp: number
	countriesTopo: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>
}

type VariablesAndDatesFetchedPayload = {
	service: string
	variables: VariableInfo[]
	dates: string[]
}

type TimeseriesFetchedPayload = {
	yValues: number[]
	timeserieParams: TimeserieParams
}

const appSlice = createSlice({
	name: 'app',
	initialState: stateProps.defaultState,
	reducers: {
		error: (state, action: PayloadAction<Error>) => {
			state.toasterData = new Toaster.ToasterData(Toaster.TOAST_ERROR, action.payload.message.split('\n')[0]);
			state.showTSSpinner = false;
			state.isFetchingTimeserieData = false;
			state.controls = new ControlsHelper().copyWith({services: state.controls.services.withSelected(-1)});
		},
		metadataFetched: (state, action: PayloadAction<DataObject>) => {
			const md = action.payload
			const title = window.frameElement ? undefined : md.references.title || md.specification.self.label

			state.title = title
			state.metadata = md;
			state.legendLabel = getLegendLabel(state.controls, md);
			state.variableEnhancer = getVariables(md)!; //TODO: Figure out if all typing is correct here
		},
		countriesFetched: (state, action: PayloadAction<CountriesFetchedPayload>) => {
			state.countriesTopo = {
				ts: action.payload.timestamp,
				data: action.payload.countriesTopo
			};
		},
		servicesFetched: (state, action: PayloadAction<string[]>) => {
			state.controls.services = new Control(action.payload);
		},
		serviceSet: (state, action: PayloadAction<string>) => {
			state.raster = undefined;
			state.toasterData = undefined;
			state.controls.services = new Control([action.payload], 0);
		},
		serviceSelected: (state, action: PayloadAction<number>) => {
			state.raster = undefined;
			state.toasterData = undefined;
			state.colorMaker = undefined;
			state.timeserieParams = undefined;
			state.controls = state.controls.withSelectedService(action.payload);
		},
		variablesAndDatesFetched: (state, action: PayloadAction<VariablesAndDatesFetchedPayload>) => {
			const payload = action.payload;
			if (payload.service === state.controls.services.selected) {
				let vIdx = payload.variables.findIndex(vinfo => vinfo.shortName == state.initSearchParams.varName);
				if (vIdx < 0 && payload.variables.length > 0) {
					vIdx = 0;
				}

				let dIdx = payload.dates.indexOf(state.initSearchParams.date);
				if (dIdx < 0 && payload.dates.length > 0) {
					dIdx = 0;
				}

				state.controls.variables = new Control(payload.variables, vIdx);
				state.controls.dates = new Control(payload.dates, dIdx);

				if(vIdx >= 0) {
					const extra = state.controls.variables.selected?.extra;
					state.controls.extraDim = (extra && extra.labels.length > 0)
						? new Control(extra.labels, 0)
						: defaultControl;
				}

				state.legendLabel = getLegendLabel(state.controls, state.metadata);
			}
		},
		variableSelected: (state, action: PayloadAction<number>) => {
			const oldVar = state.controls.variables.selected;
			state.controls.variables.selectedIdx = action.payload;
			const newVar = state.controls.variables.values[action.payload];

			if (newVar === null || newVar.extra === undefined) {
				state.controls.extraDim = defaultControl;
			} else if(oldVar == null || oldVar.extra == undefined || oldVar.extra.name != newVar.extra.name) {
				state.controls.extraDim = new Control(newVar.extra.labels, 0);
			}

			state.rangeFilter = stateProps.defaultRangeFilter;
			state.legendLabel = getLegendLabel(state.controls, state.metadata);
			state.raster = undefined;
			state.colorMaker = undefined;
		},
		dateSelected: (state, action: PayloadAction<number>) => {
			state.controls.dates.selectedIdx = action.payload;
		},
		extraDimSelected: (state, action: PayloadAction<number>) => {
			state.controls.extraDim.selectedIdx = action.payload;
		},
		delaySelected: (state, action: PayloadAction<number>) => {
			state.controls.delays.selectedIdx = action.payload;
		},
		setRangeFilter: (state, action: PayloadAction<RangeFilter>) => {
			const rangeMm = getRangeFilterMinMax(action.payload);
			const minMax = selectMinMax([rangeMm, state.fullMinMax]);
			state.minMax = minMax;
			state.rangeFilter = action.payload;
			state.colorMaker = getColorMaker(minMax, state.controls.colorMaps);
		},
		rasterFetched: (state, action: PayloadAction<BinRaster>) => {
			if (action.payload.id !== state.controls.rasterId) {
				return;
			}

			const rangeFilterMinMax = getRangeFilterMinMax(state.rangeFilter);
			const globalMinMax = getGlobalMinMax(state.controls, state.metadata);
			const rasterMinMax = action.payload.stats;

			const fullMinMax = selectMinMax([globalMinMax, rasterMinMax]);
			const minMax = selectMinMax([rangeFilterMinMax, fullMinMax]) || rasterMinMax;

			const isDiverging = isDivergingData({raster: action.payload, fullMinMax: fullMinMax});
			const wasDiverging = isDivergingData({raster: state.raster, fullMinMax: state.fullMinMax});

			if (isDiverging !== wasDiverging) {
				const gamma = state.controls.gammas.selected ?? defaultGammas.selected!;
				const suitableMaps = colorMaps.filter(cm => cm.isForDivergingData === isDiverging);
				const cmControl = new ColormapControl(suitableMaps.map(cm => cm.withGamma(gamma)), 0)
				state.controls.colorMaps = cmControl;
			}

			
			if (minMax.min !== state.minMax?.min || minMax.max !== state.minMax?.max) {
				state.colorMaker = getColorMaker(minMax, state.controls.colorMaps);
			}

			state.raster = action.payload;
			state.rasterFetchCount += 1;
			state.minMax = minMax;
			state.fullMinMax = fullMinMax;
		},
		gammaSelected: (state, action: PayloadAction<number>) => {
			if (state.controls.gammas.values[action.payload] === null) {
				return;
			}

			state.controls.gammas.selectedIdx = action.payload;
			state.controls.colorMaps = state.controls.colorMaps.withGamma(state.controls.gammas.values[action.payload]);
			state.colorMaker = getColorMaker(state.minMax, state.controls.colorMaps);
		},
		colorrampSelected: (state, action: PayloadAction<number>) => {
			const colorMaps = state.controls.colorMaps.withSelected(action.payload);
	
			if (colorMaps.selected === null) {
				return;
			}

			state.controls.colorMaps = colorMaps;
			state.colorMaker = getColorMaker(state.minMax, state.controls.colorMaps);
		},
		fetchingTimeserie: (state, action: PayloadAction) => {
			state.isFetchingTimeserieData = true;
			state.timeserieData = [];
		},
		timeserieFetched: (state, action: PayloadAction<TimeseriesFetchedPayload>) => {
			state.isFetchingTimeserieData = false;
			state.timeserieData = getTimeserieData(state.controls.dates.values, action.payload.yValues);
			state.timeserieParams = action.payload.timeserieParams;
			state.latlng = action.payload.timeserieParams.latlng;
		},
		timeserieReset: (state, action: PayloadAction) => {
			state.timeserieData = [];
			state.timeserieParams = undefined;
		},
		toggleTsSpinner: (state, action: PayloadAction<boolean>) => {
			state.showTSSpinner = action.payload;
		},
		pushPlay: (state, action: PayloadAction) => {
			const request = state.controls.rasterRequest
			if (request) { 
				state.playingMovie = !state.playingMovie;
			}
		},
		incrementRaster: (state, action: PayloadAction<number>) => {
			const controls = state.controls.withIncrementedDate(action.payload);
			if (state.controls.rasterRequest === undefined) {
				state.playingMovie = false;
			} else {
				state.controls.dates.selectedIdx = controls.dates.selectedIdx;
			}
		},
	}
});

function isDivergingData(state: {raster?: Omit<BinRaster, '_data'>, fullMinMax?: MinMax}): boolean | undefined {
	const {raster, fullMinMax} = state;
	if (fullMinMax !== undefined) {
		return fullMinMax.min < 0 && fullMinMax.max > 0;
	}
	if (raster === undefined) {
		return undefined;
	}
	return raster.stats.min < 0 && raster.stats.max > 0;
}

function getColorMaker(minMax: MinMax | undefined, control: ColormapControl): ((v: number) => RGBA) | undefined {
	if (minMax === undefined || control.selected === null) {
		return undefined;
	}
	return control.selected.getColorMaker(minMax.min, minMax.max);
}

function selectMinMax(mms: [Partial<MinMax> | undefined, Partial<MinMax> | undefined]): MinMax | undefined {
	const [first, second] = mms;
	const min = first?.min ?? second?.min;
	const max = first?.max ?? second?.max;

	return (min === undefined || max === undefined) ? undefined : {min, max};
}

function getVarMetas(dobj?: DataObject): VarMeta[] | undefined {
	return dobj
		? ((dobj.specificInfo as SpatioTemporalMeta).variables
			|| (dobj.specificInfo as StationTimeSeriesMeta).columns)
		: undefined;
}

function getVariableInfo(controls?: ControlsHelper, metadata?: DataObject): VarMeta | undefined {
	const selectedVariable = controls?.variables?.selected;
	if (!selectedVariable) {
		return undefined;
	}

	return getVarMetas(metadata)?.find(v => v.label === selectedVariable.shortName);
}

function getGlobalMinMax(controls?: ControlsHelper, metadata?: DataObject): MinMax | undefined {
	const minMax = getVariableInfo(controls, metadata)?.minMax;
	return minMax !== undefined ? {min: minMax[0], max: minMax[1]}: undefined;
}

function getRangeFilterMinMax(rangeFilter: RangeFilter): Partial<MinMax> {
	return {min: rangeFilter.rangeValues.minRange, max: rangeFilter.rangeValues.maxRange};
}

function getLegendLabel(controls?: ControlsHelper, metadata?: DataObject): string {
	const metaVar = getVariableInfo(controls, metadata);

	if (metaVar && metaVar.valueType.self.label) {
		const unit = metaVar.valueType.unit ? ` [${metaVar.valueType.unit}]` : "";
		return `${metaVar.valueType.self.label}${unit}`;
	}
	return controls?.variables?.selected?.longName ?? 'Legend';
}

function getVariables(metadata?: DataObject): Record<string, string> | undefined {
	return getVarMetas(metadata)?.reduce(
		(acc: Record<string, string>, v: VarMeta) => {
			acc[v.label] = `${v.valueType.self.label} (${v.label})`;
			return acc;
		},
		{}
	);
}

function getTimeserieData(dates: string[], yValues: number[]): TimeserieData[] {
	return dates.length === yValues.length
		? dates.map((date: string, idx: number) => [new Date(date), yValues[idx]])
		: [[0, 1]];
}

export const { error, metadataFetched, countriesFetched, servicesFetched, serviceSet, serviceSelected,
	variablesAndDatesFetched, variableSelected, dateSelected, extraDimSelected, delaySelected,
	setRangeFilter, rasterFetched, gammaSelected, colorrampSelected, fetchingTimeserie, timeserieFetched,
	timeserieReset, toggleTsSpinner, pushPlay, incrementRaster } = appSlice.actions;

export default appSlice.reducer;

