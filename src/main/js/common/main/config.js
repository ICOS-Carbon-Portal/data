
export const ICOS = "ICOS";
export const SITES = "SITES";
export const ICOSCities = "ICOSCities";
export const TIMESERIES = "TIMESERIES";
export const NETCDF = "NETCDF";
export const MAPGRAPH = "MAPGRAPH";
export const PHENOCAM = "PHENOCAM";
export const envri = window.envri

const metaBaseUri = `https://${window.envriConfig.metaHost}`;
const authBaseUri = `https://${window.envriConfig.authHost}`;
const restheartDbUrls = {
	ICOS: '//restheart.icos-cp.eu/db/',
	SITES: '//restheart.icos-cp.eu/sitesdb/',
	ICOSCities: '//cityrestheart.icos-cp.eu/pauldb/'
};

export default {
	sparqlEndpoint: metaBaseUri + '/sparql',
	restheartDbUrl: restheartDbUrls[envri],
	restheartProfileBaseUrl: `${authBaseUri}/db/users`,
	portalUseLogUrl: `${authBaseUri}/logs/portaluse`,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	metaBaseUri,
	authBaseUri,
	cpmetaObjectUri: window.envriConfig.dataItemPrefix + 'objects/',
	sparqlGraphFilter: window.envriConfig.metaItemPrefix,
	previewTypes: {
		TIMESERIES,
		NETCDF,
		MAPGRAPH,
		PHENOCAM
	}
};
