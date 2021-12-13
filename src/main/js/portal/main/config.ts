import commonConfig, {ICOS, SITES, NETCDF, TIMESERIES, MAPGRAPH} from '../../common/main/config';
import { Obj } from '../../common/main/types';
import {UrlStr} from "./backend/declarations";
import { BaseMapName } from './models/ol/baseMaps';
import { supportedSRIDsFriendlyNames, SupportedSRIDs } from './models/ol/projections';
import { BaseMapFilter } from './models/ol/utils';
import olStyles from './models/ol/styles';

export type Envri = typeof ICOS | typeof SITES;
export type PreviewType = typeof MAPGRAPH | typeof NETCDF | typeof TIMESERIES

type EnvriUrl = { [E in Envri]: UrlStr }

const envri = commonConfig.envri as Envri;

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

const featureFlags = {
	ICOS: {
		shortenDataTypeLabel: false,
		displayStationInExtendedInfo: false,
		displayFileNameInExtendedInfo: true,
		displayDataLevel: true,
		displayStationIds: true
	},
	SITES: {
		shortenDataTypeLabel: true,
		displayStationInExtendedInfo: true,
		displayFileNameInExtendedInfo: false,
		displayDataLevel: true,
		displayStationIds: false
	}
}

const sridsInMap: Partial<Obj<string, SupportedSRIDs>> = envri === 'ICOS'
	? {
		'3035': supportedSRIDsFriendlyNames['3035'],
		'54030': supportedSRIDsFriendlyNames['54030']
	}
	: { '3006': supportedSRIDsFriendlyNames['3006'] };
const defaultSRID: SupportedSRIDs = envri === 'ICOS' ? '3035' : '3006';
const defaultBaseMapName: BaseMapName = envri === 'ICOS' ? 'Physical' : 'LM Topo gray';
const baseMapFilter: BaseMapFilter = envri === 'SITES'
	? _ => true
	: bm => bm.isWorldWide;
const includedStation = envri === 'ICOS'
	? olStyles.cirlcePointStyle('tomato', 'white', 6, 2)
	: olStyles.cirlcePointStyle('Magenta', 'white', 6, 2);
const excludedStation = envri === 'ICOS'
	? olStyles.cirlcePointStyle('white', 'DarkRed', 4, 2)
	: olStyles.cirlcePointStyle('white', 'DarkMagenta', 4, 2);

export default {
	envri,
	olMapSettings: {
		sridsInMap,
		defaultSRID,
		defaultBaseMapName,
		baseMapFilter,
		iconStyles: {
			includedStation,
			excludedStation
		}
	},
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
	} as Obj,
	restheartDbUrl: commonConfig.restheartDbUrl,
	stepsize: 20,
	useDataObjectsCache: true,
	dobjCacheFetchLimit: 60,
	dobjExtendedCacheFetchLimit: 20,
	objectUriPrefix,
	metaResourceGraph,
	previewXaxisCols: ['TIME', 'Date', 'UTC_TIMESTAMP', 'TIMESTAMP'],
	historyStateMaxAge: (1000 * 3600 * 24),
	exportCSVLimit: 20_000,
	searchResultsCSVName,
	features: featureFlags[envri],
	doiBaseUrl: "https://doi.org/"
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
	countryCode: 'Responsible country',
	submitter: 'Data submitter',
	station: 'Station of origin',
	stationclass: 'Station class',
	project: 'Project',
	ecosystem: 'Ecosystem type',
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
	SITES: { ...defaultCategNames, station: 'Station', ecosystem: 'Ecosystem', project: 'Thematic programme', valType: 'Parameter'},
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
		ecosystem: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
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

export type DateCategories = 'dataTime' | 'submission';
export type FilterName = CategoryType | NumberFilterCategories | DateCategories | 'keywordFilter';
type IFilterCategories = {
	[E in Envri]: ReadonlyArray<{
		panelTitle: string
		filterList: ReadonlyArray<FilterName>
	}>
}

export const filters: IFilterCategories = {
	ICOS: [
		{panelTitle: "Data origin", filterList: ['project', 'theme', 'station', 'stationclass', 'ecosystem', 'countryCode', 'submitter', 'samplingHeight']},
		{panelTitle: "Data types", filterList: ['type', 'keywordFilter', 'level', 'format']},
		{panelTitle: "Value types", filterList: ['variable', 'valType', 'quantityUnit', 'quantityKind']},
		{panelTitle: "Sampling date", filterList: ['dataTime']},
		{panelTitle: "Submission date", filterList: ['submission']},
		{panelTitle: "Misc", filterList: ['fileSize']}
	],
	SITES: [
		{panelTitle: "Data origin", filterList: ['theme', 'station', 'location', 'ecosystem', 'project']},
		{panelTitle: "Data types", filterList: ['type', 'keywordFilter', 'level']},
		{panelTitle: "Measurements", filterList: ['valType', 'variable']},
		{panelTitle: "Sampling date", filterList: ['dataTime']},
		{panelTitle: "Submission date", filterList: ['submission']},
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

export const themeUris = {
	atmospheric: "http://meta.icos-cp.eu/resources/themes/atmosphere"
};

export interface PublicQueryDeclaration {
	label: string
	comment: string
}

export type QueryName = 'specBasics' | 'specColumnMeta' | 'dobjOriginsAndCounts' | 'extendedDataObjectInfo' | 'labelLookup' | 'specKeywordsQuery'

export const publicQueries: Obj<PublicQueryDeclaration, QueryName> = {
	specBasics: {
		label: 'Data type basics',
		comment: 'Basic information about data types.'
	},
	specColumnMeta: {
		label: 'Variables',
		comment: 'Variable metadata, relation to data types.'
	},
	dobjOriginsAndCounts: {
		label: 'Statistics of data object origins',
		comment: 'Data object counts per data type/station/submitter/site (optional).'
	},
	extendedDataObjectInfo: {
		label: 'Detailed data object info',
		comment: 'Details about the data objects in the visible search result list (20 items).'
	},
	labelLookup: {
		label: 'Labels',
		comment: 'User-friendly labels for various metadata entities (URI resources).'
	},
	specKeywordsQuery: {
		label: 'Keywords',
		comment: 'Keywords associated with data types.'
	},
};

export type Breadcrumb = { label: string, url: UrlStr }
export const breadcrumbs: { [E in Envri]: ReadonlyArray<Breadcrumb> } = {
	ICOS: [
		{ label: "Home", url: "https://www.icos-cp.eu/" },
		{ label: "Data & Services", url: "https://www.icos-cp.eu/data-services" },
		{ label: "ICOS Data Portal", url: "/portal"}
	],
	SITES: [
		{ label: "Home", url: "https://www.fieldsites.se" },
		{ label: "Data catalogue", url: "/portal" }
	]
};