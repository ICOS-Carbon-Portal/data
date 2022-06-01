
export const ICOS = "ICOS";
export const SITES = "SITES";
export const TIMESERIES = "TIMESERIES";
export const NETCDF = "NETCDF";
export const MAPGRAPH = "MAPGRAPH";

const envri = typeof location !== 'undefined' && location.host.indexOf('fieldsites.se') >= 0 ? SITES : ICOS;
const metaHost = `https://${window.configuration.META_HOST}`;
const sparqlGraphFilter = envri === SITES ? 'https://meta.fieldsites.se/' : 'http://meta.icos-cp.eu/';

const authHost = envri === SITES ? 'auth.fieldsites.se' : 'cpauth.icos-cp.eu';

const restheartDb = envri === SITES ? 'sitesdb' : 'db';
const metaObjectUri = envri === SITES ? 'https://meta.fieldsites.se/objects/' : 'https://meta.icos-cp.eu/objects/';

export default {
	sparqlEndpoint: metaHost + '/sparql',
	restheartDbUrl: `//restheart.icos-cp.eu/${restheartDb}/`,
	restheartProfileBaseUrl: `//${authHost}/db/users`,
	portalUseLogUrl: `//${authHost}/logs/portaluse`,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	metaBaseUri: metaHost,
	cpmetaObjectUri: metaObjectUri,
	envri,
	sparqlGraphFilter,
	previewTypes: {
		TIMESERIES,
		NETCDF,
		MAPGRAPH
	}
};
