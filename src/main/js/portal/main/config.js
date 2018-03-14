export default {
	ROUTE_SEARCH: 'search',
	ROUTE_CART: 'cart',
	DEFAULT_ROUTE: 'search',
	TIMESERIES: 'TIMESERIES',
	NETCDF: 'NETCDF',
	iFrameBaseUrl: {
		TIMESERIES: '//data.icos-cp.eu/dygraph-light/',
		NETCDF: '//data.icos-cp.eu/netcdf/'
	},
	restheartBaseUrl: '//cpauth.icos-cp.eu/db/',
	restheartPortalUseBaseUrl: '//restheart.icos-cp.eu/db/',
	STEPSIZE: 20
};

export const placeholders = {
	specLabel: 'Data type',
	level: 'Data level',
	format: 'Format',
	colTitle: 'Column name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit',
	submitter: 'Data submitter',
	station: 'Station of origin',
	isIcos: 'ICOS / non-ICOS data'
};
