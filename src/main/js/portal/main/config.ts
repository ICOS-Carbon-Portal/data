import commonConfig, {ICOS, SITES, NETCDF, TIMESERIES, MAPGRAPH} from '../../common/main/config';
import {UrlStr} from "./backend/declarations";

export type Envri = typeof ICOS | typeof SITES;
export type PreviewType = typeof MAPGRAPH | typeof NETCDF | typeof TIMESERIES

const routes = {
	ROUTE_SEARCH: 'search',
	ROUTE_CART: 'cart',
	ROUTE_METADATA: 'metadata',
	ROUTE_PREVIEW: 'preview',
	DEFAULT_ROUTE: 'search'
} as const;

export default {
	envri: commonConfig.envri as Envri,
	...routes,
	...commonConfig.previewTypes,
	netCdfFormat: 'http://meta.icos-cp.eu/ontologies/cpmeta/netcdf',
	mapGraphFormats: [
		'http://meta.icos-cp.eu/ontologies/cpmeta/asciiOtcSocatTimeSer',
		'http://meta.icos-cp.eu/ontologies/cpmeta/asciiOtcProductCsv'
	],
	iFrameBaseUrl: {
		TIMESERIES: '/dygraph-light/',
		NETCDF: '/netcdf/',
		MAPGRAPH: '/map-graph/'
	},
	restheartBaseUrl: commonConfig.restheartBaseUrl,
	stepsize: 20,
	useDataObjectsCache: true,
	dobjCacheFetchLimit: 60,
	dobjExtendedCacheFetchLimit: 20,
	previewIdPrefix: {
		ICOS: 'https://meta.icos-cp.eu/objects/',
		SITES: 'https://meta.fieldsites.se/objects/'
	},
	historyStateMaxAge: (1000 * 3600 * 24)
};

const defaultCategNames = {
	type: 'Data type',
	level: 'Data level',
	format: 'Format',
	theme: 'Theme',
	colTitle: 'Column name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit of measurement',
	submitter: 'Data submitter',
	station: 'Station of origin',
	project: 'Project'
};

type CategoryNamesDict = typeof defaultCategNames;
export type CategoryType = keyof CategoryNamesDict;

export const placeholders: {[E in Envri]: CategoryNamesDict} = {
	ICOS: defaultCategNames,
	SITES: {...defaultCategNames, station: 'Station', project: 'Thematic programme', valType: 'Parameter'},
};

export type CategPrefix = UrlStr | {prefix: string, value: UrlStr}[]
type PrefixConfig = {[key in CategoryType]?: CategPrefix}

export const prefixes: {[key in Envri]: PrefixConfig} = {
	ICOS: {
		project: 'http://meta.icos-cp.eu/resources/projects/',
		theme: 'http://meta.icos-cp.eu/resources/themes/',
		station: [
			{prefix: 'w', value: 'http://meta.icos-cp.eu/resources/wdcgg/station/'},
			{prefix: 'i', value: 'http://meta.icos-cp.eu/resources/stations/'}
		],
		submitter: [
			{prefix: 'o', value: 'http://meta.icos-cp.eu/resources/organizations/'},
			{prefix: 's', value: 'http://meta.icos-cp.eu/resources/stations/'}
		],
		type: 'http://meta.icos-cp.eu/resources/cpmeta/',
		format: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
		valType: 'http://meta.icos-cp.eu/resources/cpmeta/',
		quantityKind: 'http://meta.icos-cp.eu/resources/cpmeta/'
	},
	SITES: {
		project: 'https://meta.fieldsites.se/resources/projects/',
		theme: 'https://meta.fieldsites.se/resources/themes/',
		station: 'https://meta.fieldsites.se/resources/stations/',
		submitter: [
			{prefix: 'o', value: 'https://meta.fieldsites.se/resources/organizations/'},
			{prefix: 's', value: 'https://meta.fieldsites.se/resources/stations/'}
		],
		type: 'https://meta.fieldsites.se/resources/objspecs/',
		format: 'https://meta.fieldsites.se/ontologies/sites/',
		valType: 'https://meta.fieldsites.se/resources/',
		quantityKind: 'https://meta.fieldsites.se/resources/'
	}
};

type IFilterCategories = {
	[E in Envri]: ReadonlyArray<{
		panelTitle: string;
		filterList: ReadonlyArray<CategoryType>;
	}>
}

export const filters: IFilterCategories = {
	ICOS: [
		{panelTitle: "Data origin", filterList: ['project', 'theme', 'station', 'submitter']},
		{panelTitle: "Data types", filterList: ['type', 'level', 'format']},
		{panelTitle: "Value types", filterList: ['colTitle', 'valType', 'quantityUnit', 'quantityKind']}
	],
	SITES: [
		{panelTitle: "Data origin", filterList: ['theme', 'station', 'project']},
		{panelTitle: "Data types", filterList: ['type', 'level', 'format']},
		{panelTitle: "Measurements", filterList: ['valType', 'quantityUnit', 'colTitle']}
	]
};
