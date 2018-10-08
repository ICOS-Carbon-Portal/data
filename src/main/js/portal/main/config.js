import commonConfig from '../../common/main/config';


export default {
	envri: commonConfig.envri,
	ROUTE_SEARCH: 'search',
	ROUTE_CART: 'cart',
	ROUTE_PREVIEW: 'preview',
	DEFAULT_ROUTE: 'search',
	TIMESERIES: 'TIMESERIES',
	NETCDF: 'NETCDF',
	netCdfFormat: 'http://meta.icos-cp.eu/ontologies/cpmeta/netcdf',
	iFrameBaseUrl: {
		TIMESERIES: '/dygraph-light/',
		NETCDF: '/netcdf/'
	},
	restheartBaseUrl: commonConfig.restheartBaseUrl,
	stepsize: 20,
	useDataObjectsCache: true,
	dobjCacheFetchLimit: 60,
	dobjExtendedCacheFetchLimit: 20,
	previewIdPrefix: 'https://meta.icos-cp.eu/objects/',
	historyStateMaxAge: (1000 * 3600 * 24),
	dobjSortLimit: 2000,
};

export const placeholders = {
	type: 'Data type',
	level: 'Data level',
	format: 'Format',
	theme: 'Theme',
	colTitle: 'Column name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit',
	submitter: 'Data submitter',
	station: 'Station of origin',
	project: 'Project'
};

export const prefixes = {
	ICOS: {
		project: 'http://meta.icos-cp.eu/resources/projects/',
		theme: 'http://meta.icos-cp.eu/resources/themes/',
		station: 'http://meta.icos-cp.eu/resources/stations/',
		submitter: 'http://meta.icos-cp.eu/resources/organizations/',
		type: 'http://meta.icos-cp.eu/resources/cpmeta/',
		format: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
		valType: 'http://meta.icos-cp.eu/resources/cpmeta/',
		quantityKind: 'http://meta.icos-cp.eu/resources/cpmeta/'
	},
	SITES: {
		project: 'https://meta.fieldsites.eu/resources/projects/',
		theme: 'https://meta.fieldsites.eu/resources/themes/',
		station: 'https://meta.fieldsites.eu/resources/stations/',
		submitter: 'https://meta.fieldsites.eu/resources/organizations/',
		type: 'https://meta.fieldsites.eu/resources/cpmeta/',
		format: 'https://meta.fieldsites.eu/ontologies/cpmeta/',
		valType: 'https://meta.fieldsites.eu/resources/cpmeta/',
		quantityKind: 'https://meta.fieldsites.eu/resources/cpmeta/'
	}
};