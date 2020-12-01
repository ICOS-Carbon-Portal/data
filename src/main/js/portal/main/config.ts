import commonConfig, {ICOS, SITES, NETCDF, TIMESERIES, MAPGRAPH} from '../../common/main/config';
import {IdxSig, UrlStr} from "./backend/declarations";

export type Envri = typeof ICOS | typeof SITES;
export type PreviewType = typeof MAPGRAPH | typeof NETCDF | typeof TIMESERIES

type EnvriUrl = {[E in Envri]: UrlStr}

const objectUriPrefix: EnvriUrl = {
	ICOS: 'https://meta.icos-cp.eu/objects/',
	SITES: 'https://meta.fieldsites.se/objects/'
};

const metaResourceGraph: EnvriUrl = {
	ICOS: 'http://meta.icos-cp.eu/resources/cpmeta/',
	SITES: 'https://meta.fieldsites.se/resources/sites/'
};

const searchResultsCSVName = {
	ICOS: 'Carbon Portal Search Result.csv',
	SITES: 'SITES Data Portal Search Results.csv'
}

export default {
	envri: commonConfig.envri as Envri,
	...commonConfig.previewTypes,
	netCdfFormat: 'http://meta.icos-cp.eu/ontologies/cpmeta/netcdf',
	mapGraph: {
		latValueType: 'http://meta.icos-cp.eu/resources/cpmeta/latitude',
		lonValueType: 'http://meta.icos-cp.eu/resources/cpmeta/longitude',
		formats: [
			'http://meta.icos-cp.eu/ontologies/cpmeta/asciiOtcSocatTimeSer',
			'http://meta.icos-cp.eu/ontologies/cpmeta/asciiOtcProductCsv'
		]
	},
	iFrameBaseUrl: {
		TIMESERIES: '/dygraph-light/',
		NETCDF: '/netcdf/',
		MAPGRAPH: '/map-graph/'
	} as IdxSig,
	restheartBaseUrl: commonConfig.restheartBaseUrl,
	stepsize: 20,
	useDataObjectsCache: true,
	dobjCacheFetchLimit: 60,
	dobjExtendedCacheFetchLimit: 20,
	objectUriPrefix,
	metaResourceGraph,
	previewXaxisCols: ['TIME', 'Date', 'UTC_TIMESTAMP', 'TIMESTAMP'],
	historyStateMaxAge: (1000 * 3600 * 24),
	exportCSVLimit: 20_000,
	searchResultsCSVName
};

const defaultCategNames = {
	type: 'Data type',
	level: 'Data level',
	format: 'Format',
	theme: 'Theme',
	variable: 'Variable name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit of measurement',
	submitter: 'Data submitter',
	station: 'Station of origin',
	project: 'Project',
	ecosystem: 'Ecosystem',
	location: 'Location'
};

type CategoryNamesDict = typeof defaultCategNames;
export type CategoryType = keyof CategoryNamesDict;

export const numberFilterKeys = ['samplingHeight', 'fileSize'] as const;
export type NumberFilterCategories = typeof numberFilterKeys[number];

export const numericFilterLabels: {[key in NumberFilterCategories]: string} = {
	"samplingHeight": 'Sampling height (meters)',
	"fileSize": 'File size (bytes)'
};

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
		location: 'https://meta.fieldsites.se/resources/areas/',
		ecosystem: 'https://meta.fieldsites.se/resources/ecosystems/',
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

export type FilterName = CategoryType | NumberFilterCategories | 'temporalFilter' | 'keywordFilter';
type IFilterCategories = {
	[E in Envri]: ReadonlyArray<{
		panelTitle: string
		filterList: ReadonlyArray<FilterName>
	}>
}

export const filters: IFilterCategories = {
	ICOS: [
		{panelTitle: "Data origin", filterList: ['project', 'theme', 'station', 'submitter', 'samplingHeight']},
		{panelTitle: "Data types", filterList: ['type', 'keywordFilter', 'level', 'format']},
		{panelTitle: "Value types", filterList: ['variable', 'valType', 'quantityUnit', 'quantityKind']},
		{panelTitle: "Temporal filters", filterList: ['temporalFilter']},
		{panelTitle: "Misc", filterList: ['fileSize']}
	],
	SITES: [
		{panelTitle: "Data origin", filterList: ['theme', 'station', 'location', 'ecosystem', 'project']},
		{panelTitle: "Data types", filterList: ['type', 'keywordFilter']},
		{panelTitle: "Measurements", filterList: ['valType', 'quantityUnit', 'variable']},
		{panelTitle: "Temporal filters", filterList: ['temporalFilter']}
	]
};

export const timezone = {
	ICOS: {
		offset: 0,
		label: "UTC"
	},
	SITES: {
		offset: 1,
		label: "UTC+1"
	}
};

export const featureFlags = {
	ICOS: {
		shortenDataTypeLabel: false,
		displayStationInExtendedInfo: false,
		displayFileNameInExtendedInfo: true,
		displayDataLevel: true,
	},
	SITES: {
		shortenDataTypeLabel: true,
		displayStationInExtendedInfo: true,
		displayFileNameInExtendedInfo: false,
		displayDataLevel: false
	}
}