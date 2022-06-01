
export const ICOS = "ICOS";
export const SITES = "SITES";
export const TIMESERIES = "TIMESERIES";
export const NETCDF = "NETCDF";
export const MAPGRAPH = "MAPGRAPH";

const envri = typeof location !== 'undefined' && location.host.indexOf('fieldsites.se') >= 0 ? SITES : ICOS;
const metaBaseUri = `https://${window.envriConfig.metaHost}/`;
const authHost = window.envriConfig.authHost;
const restheartDb = envri === SITES ? 'sitesdb' : 'db';

export default {
	sparqlEndpoint: metaBaseUri + 'sparql',
	restheartDbUrl: `//restheart.icos-cp.eu/${restheartDb}/`,
	restheartProfileBaseUrl: `//${authHost}/db/users`,
	portalUseLogUrl: `//${authHost}/logs/portaluse`,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	metaBaseUri,
	cpmetaObjectUri: window.envriConfig.dataItemPrefix + 'objects/',
	envri,
	sparqlGraphFilter: window.envriConfig.metaItemPrefix,
	previewTypes: {
		TIMESERIES,
		NETCDF,
		MAPGRAPH
	}
};
