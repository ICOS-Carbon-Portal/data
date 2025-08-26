import { BinRaster } from "icos-cp-backend";
import { RGBA } from "icos-cp-spatial";
import { envri } from "../../../common/main/config";
import { DataObject } from "../../../common/main/metacore";
import { colorRamps } from "../../../common/main/models/colorRampDefs";
import { ControlsHelper } from "./ControlsHelper";


const isSites = envri === "SITES";

const pathName = window.location.pathname;
const sections = pathName.split('/');
const pidIdx = sections.indexOf('netcdf') + 1;
const pid = sections[pidIdx];
const isPIDProvided = pid !== '';

const searchStr = window.decodeURIComponent(window.location.search).replace(/^\?/, '');
const keyValpairs = searchStr.split('&');
const searchParams = keyValpairs.reduce<Record<string,string>>((acc, curr) => {
	const p = curr.split('=');
	acc[p[0]] = p[1];
	return acc;
}, {});

const controls = new ControlsHelper();
export const defaultGamma = 1;
const gammaIdx = searchParams.gamma
	? controls.gammas.values.indexOf(parseFloat(searchParams.gamma))
	: controls.gammas.values.indexOf(defaultGamma);
let colorIdx = searchParams.color
	? colorRamps.findIndex(color => color.name === searchParams.color)
	: 0;
colorIdx = colorIdx === -1 ? 0 : colorIdx;

export type RangeValues = {
	minRange?: number
	maxRange?: number
}

export interface RangeFilter {
	rangeValues: RangeValues
	valueFilter: (v: number) => number
}
const defaultRangeFilter: RangeFilter = {
	rangeValues: {},
	valueFilter: v => v
};

export type MinMax = {
	min: number
	max: number
}

export type Latlng = {
	lat: number
	lng: number
}
export type TimeserieData = [Date | number, number]
export type TimeserieParams = {
	objId: string
	variable: string
	extraDimInd: number | null,
	x: number,
	y: number,
	latlng: Latlng
}

export interface State {
	isSites: boolean
	isPIDProvided: boolean
	metadata?: DataObject
	minMax?: MinMax
	fullMinMax?: MinMax
	rangeFilter: RangeFilter
	legendLabel: string
	colorMaker?: (value: number) => RGBA
	controls: ControlsHelper
	variableEnhancer: Record<string,string>
	countriesTopo: {
		ts: number,
		data?: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>
	}
	initSearchParams: {
		varName: string
		date: string
		gamma: string
		center: string
		zoom: string
		color: string
	}
	playingMovie: boolean
	rasterFetchCount: number
	raster?: BinRaster
	title?: string
	toasterData?: {}
	isFetchingTimeserieData: boolean
	timeserieData?: TimeserieData[]
	timeserieParams?: TimeserieParams
	latlng?: Latlng
	showTSSpinner: boolean
}

const defaultState: State = {
	isSites,
	isPIDProvided,
	metadata: undefined,
	minMax: undefined,
	fullMinMax: undefined,
	rangeFilter: defaultRangeFilter,
	legendLabel: 'Legend',
	colorMaker: undefined,
	controls,
	variableEnhancer: {},
	countriesTopo: {
		ts: 0,
		data: undefined
	},
	initSearchParams: {
		varName: searchParams.varName,
		date: searchParams.date,
		gamma: searchParams.gamma,
		center: searchParams.center,
		zoom: searchParams.zoom,
		color: searchParams.color,
	},
	playingMovie: false,
	rasterFetchCount: 0,
	raster: undefined,
	title: undefined,
	toasterData: undefined,
	isFetchingTimeserieData: false,
	timeserieData: [],
	timeserieParams: undefined,
	latlng: undefined,
	showTSSpinner: false
};

export default {
	defaultState,
	defaultRangeFilter,
	controls,
	gammaIdx,
	colorIdx,
	isPIDProvided,
	pid
};
