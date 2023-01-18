import {
	COLORRAMP_SELECTED, COUNTRIES_FETCHED, DATE_SELECTED, DELAY_SELECTED, ELEVATIONS_FETCHED, ELEVATION_SELECTED,
	ERROR, FETCHING_TIMESERIE, GAMMA_SELECTED, INCREMENT_RASTER, METADATA_FETCHED, NetCDFPlainAction, PUSH_PLAY,
	RASTER_FETCHED, SERVICES_FETCHED, SERVICE_SELECTED, SERVICE_SET, SET_RANGEFILTER, TIMESERIE_FETCHED,
	TIMESERIE_RESET, TOGGLE_TS_SPINNER, VARIABLES_AND_DATES_FETCHED, VARIABLE_SELECTED
} from './actionDefinitions';
import {Control, ColormapControl, ControlsHelper, defaultGammas} from './models/ControlsHelper';
import * as Toaster from 'icos-cp-toaster';
import stateProps, { MinMax, RangeFilter, State, TimeserieData } from './models/State';
import { DataObject, SpatioTemporalMeta, StationTimeSeriesMeta, VarMeta } from '../../common/main/metacore';
import { BinRaster } from 'icos-cp-backend';
import { colorMaps } from './models/Colormap';
import { RGBA } from 'icos-cp-spatial';


export default function (state = stateProps.defaultState, action: NetCDFPlainAction) {
	const payload = action.payload;

	function update(updates: Partial<State> | null | undefined): State{
		if(!updates || Object.keys(updates).length === 0) return state
		else return { ...state, ...updates }
	}

	if (payload instanceof ERROR) {
		return update({
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	else if (payload instanceof METADATA_FETCHED) {
		const md = payload.metadata
		const title = window.frameElement ? undefined : md.references.title || md.specification.self.label
		return update({
			title,
			metadata: md,
			legendLabel: getLegendLabel(getVariableInfo(state.controls, md)),
			variableEnhancer: getVariables(md)
		});
	}

	else if (payload instanceof COUNTRIES_FETCHED) {
		return update({
			countriesTopo: {
				ts: Date.now(),
				data: payload.countriesTopo
			}
		});
	}

	else if (payload instanceof SERVICES_FETCHED) {
		return update({
			controls: state.controls.copyWith({services: new Control(payload.services)})
		})
	}

	else if (payload instanceof SERVICE_SET) {
		return update({
			raster: undefined,
			controls: state.controls.copyWith({services: new Control([payload.service], 0)})
		});
	}

	else if (payload instanceof SERVICE_SELECTED) {
		return update({
			raster: undefined,
			colorMaker: undefined,
			controls: state.controls.withSelectedService(payload.idx),
			timeserieParams: undefined
		});
	}

	else if (payload instanceof VARIABLES_AND_DATES_FETCHED) {
		if (payload.service === state.controls.services.selected) {

			let vIdx = payload.variables.indexOf(state.initSearchParams.varName)
			if (vIdx < 0 && payload.variables.length > 0) vIdx = 0

			let dIdx = payload.dates.indexOf(state.initSearchParams.date)
			if (dIdx < 0 && payload.dates.length > 0) dIdx = 0

			const controls = state.controls.copyWith({
				variables: new Control(payload.variables, vIdx),
				dates: new Control(payload.dates, dIdx)
			})

			return update({
				controls,
				legendLabel: getLegendLabel(getVariableInfo(controls, state.metadata))
			});
		} else {
			return state;
		}
	}

	else if (payload instanceof ELEVATIONS_FETCHED) {
		if (isElevationsFetched(state, payload)) {
			const elevations = payload.elevations
			let eIdx = -1
			if(elevations.length > 0){
				if(eIdx < 0 && state.lastElevation !== undefined){
					const lastElevIdx = elevations.indexOf(state.lastElevation)
					if(lastElevIdx >= 0) eIdx = lastElevIdx
				}
				const initElev = state.initSearchParams.elevation
				if(eIdx < 0 && initElev !== null){
					const initElevIdx = elevations.indexOf(initElev)
					if(initElevIdx >= 0) eIdx = initElevIdx
				}
			}
			const controls = state.controls.copyWith({elevations: new Control(elevations, eIdx)})

			return update({
				lastElevation: eIdx >= 0 ? elevations[eIdx] : state.lastElevation,
				controls
			})
		} else {
			return state;
		}
	}

	else if (payload instanceof VARIABLE_SELECTED) {
		const newControls = state.controls.withSelectedVariable(payload.idx);

		return update({
			rangeFilter: stateProps.defaultRangeFilter,
			controls: newControls,
			legendLabel: getLegendLabel(getVariableInfo(newControls, state.metadata)),
			raster: undefined,
			colorMaker: undefined
		});
	}

	else if (payload instanceof DATE_SELECTED) {
		return update({ controls: state.controls.withSelectedDate(payload.idx) });
	}

	else if (payload instanceof ELEVATION_SELECTED) {
		return update({
			lastElevation: state.controls.elevations.values[payload.idx],
			controls: state.controls.withSelectedElevation(payload.idx)
		});
	}

	else if (payload instanceof DELAY_SELECTED) {
		return update({controls: state.controls.withSelectedDelay(payload.idx)})
	}

	else if (payload instanceof SET_RANGEFILTER) {
		const rangeMm = getRangeFilterMinMax(payload.rangeFilter)
		const minMax = selectMinMax([rangeMm, state.fullMinMax])
		return update({
			minMax,
			rangeFilter: payload.rangeFilter,
			colorMaker: getColorMaker(minMax, state.controls.colorMaps)
		})
	}

	else if (payload instanceof RASTER_FETCHED) {
		return update(handleRasterFetched(state, payload));
	}

	else if (payload instanceof GAMMA_SELECTED) {
		return update(handleGammaSelected(state, payload));
	}

	else if (payload instanceof COLORRAMP_SELECTED) {
		return update(handleColorrampSelected(state, payload));
	}

	else if (payload instanceof FETCHING_TIMESERIE) {
		return update({
			isFetchingTimeserieData: true,
			timeserieData: []
		});
	}

	else if (payload instanceof TIMESERIE_FETCHED) {
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

	else if (payload instanceof TIMESERIE_RESET) {
		return update({
			timeserieData: [],
			timeserieParams: undefined
		});
	}

	else if (payload instanceof TOGGLE_TS_SPINNER) {
		return update({
			showTSSpinner: payload.showTSSpinner
		});
	}

	else if (payload instanceof PUSH_PLAY) {
		const request = state.controls.rasterRequest
		if(request === undefined) return state
		const playingMovie = !state.playingMovie;
		return update({playingMovie})
	}

	else if (payload instanceof INCREMENT_RASTER) {
		const controls = state.controls.withIncrementedDate(payload.increment)
		const request = controls.rasterRequest
		if(request === undefined) return update({playingMovie: false})
		return update({ controls})
	}

	else return state

}

type UpdateFactory<A> = (state: State, payload: A) => (Partial<State> | null)

const handleRasterFetched: UpdateFactory<RASTER_FETCHED> = (state, payload) => {
	if(payload.raster.id !== state.controls.rasterId) return null

	const rangeFilterMinMax = getRangeFilterMinMax(state.rangeFilter);
	const globalMinMax = getGlobalMinMax(state.controls, state.metadata);
	const rasterMinMax = payload.raster.stats

	const fullMinMax = selectMinMax([globalMinMax, rasterMinMax])
	const minMax = selectMinMax([rangeFilterMinMax, fullMinMax]) || rasterMinMax

	const update = {
		raster: payload.raster,
		rasterFetchCount: state.rasterFetchCount + 1,
		minMax,
		fullMinMax,
		controls: state.controls,
		colorMaker: state.colorMaker
	}

	const isDiverging = isDivergingData(update)

	if ( isDiverging !== isDivergingData(state) ) {
		const gamma = state.controls.gammas.selected || defaultGammas.selected!
		const suitableMaps = colorMaps.filter(cm => cm.isForDivergingData == isDiverging)
		const cmControl = new ColormapControl(suitableMaps.map(cm => cm.withGamma(gamma)), 0)
		update.controls = state.controls.copyWith({colorMaps: cmControl})
	}

	if(minMax.min !== state.minMax?.min || minMax.max !== state.minMax?.max){
		update.colorMaker = getColorMaker(minMax, update.controls.colorMaps)
	}
	return update
}

function isDivergingData(state: {raster?: BinRaster, fullMinMax?: MinMax}): boolean | undefined{
	const {raster, fullMinMax} = state
	if(fullMinMax !== undefined) return fullMinMax.min < 0 && fullMinMax.max > 0
	if(raster === undefined) return
	return raster.stats.min < 0 && raster.stats.max > 0
}

const handleGammaSelected: UpdateFactory<GAMMA_SELECTED> = (state, payload) => {
	let controls = state.controls.withSelectedGamma(payload.idx);
	const selectedGamma = controls.gammas.selected
	if(selectedGamma === null) return null

	controls = controls.copyWith({colorMaps: controls.colorMaps.withGamma(selectedGamma)})
	return {
		controls,
		colorMaker: getColorMaker(state.minMax, controls.colorMaps)
	}
}

const handleColorrampSelected: UpdateFactory<COLORRAMP_SELECTED> = (state, payload) => {

	const colorMaps = state.controls.colorMaps.withSelected(payload.idx)
	const colorMap = colorMaps.selected
	if(colorMap === null) return null

	const controls = state.controls.copyWith({colorMaps})
	return {
		controls,
		colorMaker: getColorMaker(state.minMax, controls.colorMaps)
	}
}

function getColorMaker(minMax: MinMax | undefined, control: ColormapControl): ((v: number) => RGBA) | undefined{
	if(minMax === undefined) return
	const cm = control.selected
	if(cm === null) return
	return cm.getColorMaker(minMax.min, minMax.max)
}

function selectMinMax(mms: Array<Partial<MinMax> | undefined>): MinMax | undefined {

	const pickVal = (key: 'min' | 'max') =>
		mms.map(mm => mm?.[key]).find(mm => mm !== undefined)

	const min = pickVal('min')
	const max = pickVal('max')

	return (min === undefined || max === undefined) ? undefined : {min, max}
}

function getVarMetas(dobj?: DataObject): VarMeta[] | undefined {
	return dobj
		? ((dobj.specificInfo as SpatioTemporalMeta).variables || (dobj.specificInfo as StationTimeSeriesMeta).columns)
		: undefined;
}

function getVariableInfo(controls?: ControlsHelper, metadata?: DataObject): VarMeta | undefined {

	const selectedVariable = controls?.variables?.selected;
	if (!selectedVariable) return

	return getVarMetas(metadata)?.find(v => v.label === selectedVariable);
};

function getGlobalMinMax(controls?: ControlsHelper, metadata?: DataObject): MinMax | undefined {
	const minMax = getVariableInfo(controls, metadata)?.minMax
	if(minMax === undefined) return
	return { min: minMax[0], max: minMax[1] }
}

function getRangeFilterMinMax(rangeFilter: RangeFilter): Partial<MinMax> {
	return { min: rangeFilter.rangeValues.minRange, max: rangeFilter.rangeValues.maxRange }
}

const getLegendLabel = (metaVar?: VarMeta) => {
	if (metaVar && metaVar.valueType.self.label) {
		const unit = metaVar.valueType.unit ? ` [${metaVar.valueType.unit}]` : ""
		return `${metaVar.valueType.self.label}${unit}`;
	}

	return 'Legend';
};

function getVariables(metadata?: DataObject): Record<string,string> | undefined {
	return getVarMetas(metadata)?.reduce(
		(acc: Record<string,string>, v: VarMeta) => {
			acc[v.label] = `${v.valueType.self.label} (${v.label})`;
			return acc;
		},
		{}
	);
}

const getTimeserieData = (dates: string[], yValues: number[]): TimeserieData[] => {
	return dates.length === yValues.length
		? dates.map((date: string, idx: number) => [new Date(date), yValues[idx]])
		: [[0, 1]];
};

function isElevationsFetched(state: State, payload: ELEVATIONS_FETCHED){
	return payload.service === state.controls.services.selected
		&& payload.variable === state.controls.variables.selected
}
