import { BinRaster } from "icos-cp-backend";
import config from "../../../common/main/config";
import { DataObject } from "../../../common/main/metacore";
import ColorMaker, { ColorMakerRamps, colorRamps } from "../../../common/main/models/ColorMaker";
import { ControlsHelper } from "./ControlsHelper";
import RasterDataFetcher from "./RasterDataFetcher";


const isSites = config.envri === "SITES";

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
	elevation: number | null,
	x: number,
	y: number,
	latlng: Latlng
}

export interface State {
	isSites: boolean
	isPIDProvided: boolean
	metadata?: DataObject
	minMax: Partial<MinMax>
	isDivergingData?: boolean
	fullMinMax?: MinMax
	rangeFilter: RangeFilter
	legendLabel: string
	colorMaker?: ColorMakerRamps
	controls: ControlsHelper
	variableEnhancer: Record<string,string>
	countriesTopo: {
		ts: number,
		data?: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>
	}
	desiredId?: string
	lastElevation?: number
	initSearchParams: {
		varName: string
		date: string
		gamma: string
		elevation: number | null
		center: string
		zoom: string
		color: string
	}
	playingMovie: boolean
	rasterFetchCount: number
	raster?: BinRaster
	rasterDataFetcher?: RasterDataFetcher
	title?: string
	toasterData?: {}
	isFetchingTimeserieData: boolean
	timeserieData?: TimeserieData[]
	timeserieParams?: TimeserieParams
	latlng?: Latlng
	showTSSpinner: boolean
}

const urlQueryElevation = Number.parseFloat(searchParams.elevation)

const defaultState: State = {
	isSites,
	isPIDProvided,
	metadata: undefined,
	minMax: { min: undefined, max: undefined },
	isDivergingData: undefined,
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
	desiredId: undefined,
	lastElevation: undefined,
	initSearchParams: {
		varName: searchParams.varName,
		date: searchParams.date,
		gamma: searchParams.gamma,
		elevation: isNaN(urlQueryElevation) ? null : urlQueryElevation,
		center: searchParams.center,
		zoom: searchParams.zoom,
		color: searchParams.color,
	},
	playingMovie: false,
	rasterFetchCount: 0,
	raster: undefined,
	rasterDataFetcher: undefined,
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
