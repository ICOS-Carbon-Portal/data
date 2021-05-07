import { Obj } from '../../../../common/main/types';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { addProjection, get, transform, fromLonLat } from 'ol/proj';
import Projection from 'ol/proj/Projection';


export const getProjection = (epsgCode: EpsgCode) => {
	if (Object.keys(projDefinitions).includes(epsgCode)) {
		proj4.defs(epsgCode, projDefinitions[epsgCode as EpsgCodeWithProj]);
		register(proj4);

		const viewParams = getViewParams(epsgCode);

		addProjection(new Projection({
			code: epsgCode,
			extent: viewParams.extent,
			worldExtent: viewParams.extent,
			units: viewParams.units
		}));
	}

	return get(epsgCode);
};

export const getTransformPointFn = (source: EpsgCode, destination: EpsgCode) =>
	source === destination
		? (lonOrX: number, latOrY: number) => [lonOrX, latOrY]
		: (lonOrX: number, latOrY: number) => transform([lonOrX, latOrY], source, destination) as [number, number];

export type EpsgCode = `EPSG:${SupportedSRIDs}`
export const supportedSRIDs = {
	"3006": "SWEREF99 TM",
	"3035": "LAEA Europe",
	"4326": "WGS 84",
	"3857": "Web Mercator",
	"54030": "World Robinson",
} as const;
export type SupportedSRIDs = keyof typeof supportedSRIDs

// These cannot be managed by openlayers so use proj4 for them
export type EpsgCodeWithProj = 'EPSG:3006' | 'EPSG:3035' | 'EPSG:54009' | 'EPSG:54030'
const projDefinitions: Obj<string, EpsgCodeWithProj> = {
	"EPSG:3006": "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
	"EPSG:3035": "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
	"EPSG:54009": "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
	"EPSG:54030": "+proj=robin +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
}

const getExtent = (bBox: BBox): [number, number, number, number] => [bBox[0][0], bBox[0][1], bBox[1][0], bBox[1][1]];
const getRect = (bBox: BBox) => [
	bBox[0][0], bBox[0][1],
	bBox[0][0], bBox[1][1],
	bBox[1][0], bBox[1][1],
	bBox[1][0], bBox[0][1],
	bBox[0][0], bBox[0][1]
];

export type BBox = [[number, number], [number, number]]
export const getViewParams = (epsgCode: EpsgCode) => {
	//const bBox3006: BBox = [[181896, 6101648], [864416, 7689478]];
	const bBox3006: BBox = [[190000, 6101648], [970000, 7689478]];
	const bBox4326: BBox = [[-180, -90], [180, 90]];
	const bBox3857: BBox = [[-20026376.39, -20048966.10], [20026376.39, 20048966.10]];
	const bBox3035: BBox = [[1896628.618, 1330000], [7058042.778, 6827128.02]];
	const bBox54030: BBox = [[-18e6, -9e6], [18e6, 9e6]];

	switch (epsgCode) {
		case 'EPSG:3006':
			return {
				initCenter: [609924, 6877630],
				extent: getExtent(bBox3006),
				rect: getRect(bBox3006),
				units: 'm'
			};

		case 'EPSG:4326':
			return {
				initCenter: [0, 20],
				extent: getExtent(bBox4326),
				units: 'degrees'
			};

		case 'EPSG:3857':
			return {
				initCenter: fromLonLat([0, 20], 'EPSG:3857'),
				extent: getExtent(bBox3857),
				units: 'm'
			};

		case 'EPSG:3035':
			return {
				initCenter: [4321000, 4080000],
				extent: getExtent(bBox3035),
				rect: getRect(bBox3035),
				units: 'm'
			};
		
		case 'EPSG:54030':
			return {
				initCenter: [0, 0],
				extent: getExtent(bBox54030),
				units: 'm'
			};

		default:
			throw new Error('Unsupported projection: ' + epsgCode);
	}
};
