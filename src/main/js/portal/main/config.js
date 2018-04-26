import commonConfig from '../../common/main/config';


export default {
	ROUTE_SEARCH: 'search',
	ROUTE_CART: 'cart',
	DEFAULT_ROUTE: 'search',
	TIMESERIES: 'TIMESERIES',
	NETCDF: 'NETCDF',
	iFrameBaseUrl: {
		TIMESERIES: '/dygraph-light/',
		NETCDF: '/netcdf/'
	},
	restheartBaseUrl: commonConfig.restheartBaseUrl,
	restheartPortalUseBaseUrl: commonConfig.restheartPortalUseBaseUrl,
	stepsize: 20,
	useDataObjectsCache: true,
	dobjCacheFetchLimit: 500,
	dobjExtendedCacheFetchLimit: 100,
};

export const placeholders = {
	specLabel: 'Data type',
	level: 'Data level',
	format: 'Format',
	theme: 'Theme',
	colTitle: 'Column name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit',
	submitter: 'Data submitter',
	station: 'Station of origin',
	isIcos: 'ICOS / non-ICOS data'
};
