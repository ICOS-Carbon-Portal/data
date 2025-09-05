import { BinRaster } from "icos-cp-backend";
import { envri } from "../../../common/main/config";
import { DataObject } from "../../../common/main/metacore";
import { Control, ControlsHelper, emptyControl } from "./ControlsHelper";
import { Colormap, allColormaps, defaultGamma } from "./Colormap";


const isSites = envri === "SITES";

const pathName = window.location.pathname;
const sections = pathName.split('/');
const pidIdx = sections.indexOf('netcdf') + 1;
export const pid = sections[pidIdx];
const isPIDProvided = pid !== '';

const searchStr = window.decodeURIComponent(window.location.search).replace(/^\?/, '');
const keyValpairs = searchStr.split('&');
const searchParams = keyValpairs.reduce<Record<string,string>>((acc, curr) => {
	const p = curr.split('=');
	acc[p[0]] = p[1];
	return acc;
}, {});

export type RangeFilter = {
	minRange?: number
	maxRange?: number
}

export const defaultRangeFilter: RangeFilter = {};

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

export const defaultGammas: Control<number> = {
	values: [0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0],
	selectedIdx: 4
};

export const defaultColormaps: Control<Colormap> = {
	values: allColormaps,
	selectedIdx: 0
};

export const defaultDelays: Control<number> = {
	values: [0, 50, 100, 200, 500, 1000, 3000],
	selectedIdx: 3
};

const initialRangeFilter: RangeFilter = {
	minRange: searchParams.rangeMin ? parseFloat(searchParams.rangeMin) : undefined,
	maxRange: searchParams.rangeMax ? parseFloat(searchParams.rangeMax) : undefined
};

export interface State {
	isSites: boolean
	isPIDProvided: boolean
	metadata?: DataObject
	minMax?: MinMax
	fullMinMax?: MinMax
	rangeFilter: RangeFilter
	legendLabel: string
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
		extraDim: string
		rangeMin: string
		rangeMax: string
	}
	playingMovie: boolean
	rasterFetchCount: number
	isDiverging: boolean
	//raster?: BinRaster // CLASS
	title?: string
	toasterData?: {}
}

export const defaultState: State = {
	isSites,
	isPIDProvided,
	metadata: undefined,
	minMax: undefined,
	fullMinMax: undefined,
	rangeFilter: initialRangeFilter.maxRange !== undefined || initialRangeFilter.minRange !== undefined
		? initialRangeFilter
		: defaultRangeFilter,
	legendLabel: 'Legend',
	controls: {
		services: emptyControl(),
		variables: emptyControl(),
		dates: emptyControl(),
		extraDim: emptyControl(),
		gammas: defaultGammas,
		delays: defaultDelays,
		colorMaps: defaultColormaps
	},
	variableEnhancer: {},
	countriesTopo: {
		ts: 0,
		data: undefined
	},
	initSearchParams: {
		varName: searchParams.varName,
		date: searchParams.date,
		gamma: searchParams.gamma ?? defaultGamma.toString(10),
		center: searchParams.center,
		zoom: searchParams.zoom,
		color: searchParams.color ?? "rainbow",
		extraDim: searchParams.extraDim,
		rangeMin: searchParams.rangeMin,
		rangeMax: searchParams.rangeMax,
	},
	playingMovie: false,
	rasterFetchCount: 0,
	isDiverging: false,
	//raster: undefined,
	title: undefined,
	toasterData: undefined
};
