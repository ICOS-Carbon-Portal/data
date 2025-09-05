import {colormapControlWithGamma, ControlsHelper, emptyControl, getRasterRequest, getRasterRequestId, getSelectedControl} from './models/ControlsHelper';
import * as Toaster from 'icos-cp-toaster';
import { defaultState, defaultRangeFilter, MinMax, TimeserieData, TimeserieParams, RangeFilter, defaultGammas } from './models/State';
import { DataObject, SpatioTemporalMeta, StationTimeSeriesMeta, VarMeta } from '../../common/main/metacore';
import { allColormaps } from './models/Colormap';
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
	initialState: defaultState,
	reducers: {
		errorOccurred: (state, action: PayloadAction<Error>) => {
			state.toasterData = new Toaster.ToasterData(Toaster.TOAST_ERROR, action.payload.message.split('\n')[0]);
			state.controls.services.selectedIdx = null;
		},
		metadataFetched: (state, action: PayloadAction<DataObject>) => {
			const md = action.payload;
			const title = window.frameElement ? undefined : md.references.title || md.specification.self.label;

			state.title = title;
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
			state.controls.services.values = action.payload;
		},
		serviceSet: (state, action: PayloadAction<string>) => {
			//state.raster = undefined;
			state.toasterData = undefined;
			state.controls.services.values = [action.payload];
			state.controls.services.selectedIdx = 0;
		},
		serviceSelected: (state, action: PayloadAction<number>) => {
			//state.raster = undefined;
			state.toasterData = undefined;
			state.controls.services.selectedIdx = action.payload;
		},
		variablesAndDatesFetched: (state, action: PayloadAction<VariablesAndDatesFetchedPayload>) => {
			console.log("running reducer variablesAndDatesFetched")
			const payload = action.payload;
			const selectedService = getSelectedControl(state.controls.services);
			if (payload.service === selectedService) {
				let vIdx = payload.variables.findIndex(vinfo => vinfo.shortName == state.initSearchParams.varName);
				if (vIdx < 0 && payload.variables.length > 0) {
					vIdx = 0;
				}

				let dIdx = payload.dates.indexOf(state.initSearchParams.date);
				if (dIdx < 0 && payload.dates.length > 0) {
					dIdx = 0;
				}

				state.controls.variables = {values: payload.variables, selectedIdx: vIdx};
				state.controls.dates = {values: payload.dates, selectedIdx: dIdx};


				if (vIdx >= 0) {
					const extra = getSelectedControl(state.controls.variables)?.extra;
					state.controls.extraDim = (extra && extra.labels.length > 0)
						? {values: extra.labels, selectedIdx: 0}
						: emptyControl();
				}

				state.legendLabel = getLegendLabel(state.controls, state.metadata);
			}
		},
		variableSelected: (state, action: PayloadAction<number>) => {
			const oldVar = getSelectedControl(state.controls.variables);
			const newControl = {values: state.controls.variables.values, selectedIdx: action.payload};
			const newVar = getSelectedControl(newControl);

			if (newVar === null || newVar.extra === undefined) {
				state.controls.extraDim = emptyControl();
			} else if(oldVar == null || oldVar.extra == undefined || oldVar.extra.name != newVar.extra.name) {
				state.controls.extraDim = {values: newVar.extra.labels, selectedIdx: 0};
			}

			state.rangeFilter = defaultRangeFilter;
			state.legendLabel = getLegendLabel(state.controls, state.metadata);
			//state.raster = undefined;
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
		rangeFilterSet: (state, action: PayloadAction<RangeFilter>) => {
			const rangeMm = getRangeFilterMinMax(action.payload);
			const minMax = selectMinMax([rangeMm, state.fullMinMax]);
			state.minMax = minMax;
			state.rangeFilter = action.payload;
			//state.colorMaker = getColorMaker(minMax, state.controls.colorMaps);
		},
		rasterFetched: (state, action: PayloadAction<{id: string, stats: MinMax}>) => {
			if (action.payload.id !== getRasterRequestId(state.controls)) {
				return;
			}

			const rangeFilterMinMax = getRangeFilterMinMax(state.rangeFilter);
			const globalMinMax = getGlobalMinMax(state.controls, state.metadata);
			const rasterMinMax = action.payload.stats;

			const fullMinMax = selectMinMax([globalMinMax, rasterMinMax]);
			const minMax = selectMinMax([rangeFilterMinMax, fullMinMax]) || rasterMinMax;

			const isDiverging = isDivergingData(action.payload.stats, fullMinMax);

			if (isDiverging !== state.isDiverging) {
				const gamma = getSelectedControl(state.controls.gammas) ?? getSelectedControl(defaultGammas)!;
				const suitableMaps = allColormaps.filter(cm => cm.isForDivergingData === isDiverging);
				const cmControl = {values: suitableMaps.map(cm => {return {...cm, gamma}}), selectedIdx: 0};
				state.controls.colorMaps = cmControl;
				state.isDiverging = isDiverging === undefined ? false : isDiverging;
			}

			//state.raster = action.payload;
			state.rasterFetchCount += 1;
			state.minMax = minMax;
			state.fullMinMax = fullMinMax;
		},
		gammaSelected: (state, action: PayloadAction<number>) => {
			const newGamma = getSelectedControl({values: state.controls.gammas.values, selectedIdx: action.payload});

			if (newGamma === null) {
				return;
			}

			state.controls.gammas.selectedIdx = action.payload;
			state.controls.colorMaps = colormapControlWithGamma(state.controls.colorMaps, newGamma);
		},
		colorrampSelected: (state, action: PayloadAction<number>) => {
			const newColorMap = getSelectedControl({values: state.controls.colorMaps.values, selectedIdx: action.payload});

			if (newColorMap === null) {
				return;
			}

			state.controls.colorMaps.selectedIdx = action.payload;
		},
		pushPlay: (state, action: PayloadAction) => {
			const request = getRasterRequest(state.controls);
			if (request) { 
				state.playingMovie = !state.playingMovie;
			}
		},
		incrementRaster: (state, action: PayloadAction<number>) => {
			if (getRasterRequest(state.controls) === undefined) {
				state.playingMovie = false;
			} else {
				const suggestedIdx = (state.controls.dates.selectedIdx ?? 0) + action.payload;
				const newIdx = suggestedIdx >= 0 && suggestedIdx < state.controls.dates.values.length
					? suggestedIdx
					: 0;
				
				state.controls.dates.selectedIdx = newIdx;
			}
		},
	}
});

function isDivergingData(stats?: MinMax, fullMinMax?: MinMax): boolean | undefined {
	if (fullMinMax !== undefined) {
		return fullMinMax.min < 0 && fullMinMax.max > 0;
	}
	if (stats === undefined) {
		return undefined;
	}
	return stats.min < 0 && stats.max > 0;
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
	const selectedVariable = controls ? getSelectedControl(controls?.variables) : undefined;
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
	return {min: rangeFilter.minRange, max: rangeFilter.maxRange};
}

function getLegendLabel(controls?: ControlsHelper, metadata?: DataObject): string {
	const metaVar = getVariableInfo(controls, metadata);

	if (metaVar && metaVar.valueType.self.label) {
		const unit = metaVar.valueType.unit ? ` [${metaVar.valueType.unit}]` : "";
		return `${metaVar.valueType.self.label}${unit}`;
	}
	const selectedVariable = controls ? getSelectedControl(controls?.variables) : undefined;
	return selectedVariable?.longName ?? 'Legend';
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

export const { errorOccurred, metadataFetched, countriesFetched, servicesFetched, serviceSet, serviceSelected,
	variablesAndDatesFetched, variableSelected, dateSelected, extraDimSelected, delaySelected,
	rangeFilterSet, rasterFetched, gammaSelected, colorrampSelected, pushPlay, incrementRaster } = appSlice.actions;

export default appSlice.reducer;

