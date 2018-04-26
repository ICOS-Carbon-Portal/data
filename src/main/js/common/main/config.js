
const endpoint = 'https://meta.icos-cp.eu/sparql';

const envri = typeof location !== 'undefined' && location.host.indexOf('fieldsites.se') >= 0 ? 'SITES' : 'ICOS';
const host = envri === 'SITES' ? 'meta.fieldsites.se' : 'meta.icos-cp.eu';
const sparqlGraphFilter = envri === 'SITES' ? 'https://meta.fieldsites.se/' : 'http://meta.icos-cp.eu/';

const authHost = envri === 'SITES' ? 'auth.fieldsites.se' : 'cpauth.icos-cp.eu';
const restheartDb = envri === 'SITES' ? 'sitesdb' : 'db';

export default {
	sparqlEndpoint: endpoint,
	restheartBaseUrl: `//${authHost}/db`,
	restheartPortalUseBaseUrl: `//restheart.icos-cp.eu/${restheartDb}`,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	cpmetaObjectUri: `https://${host.replace('local-', '')}/objects/`,
	envri,
	sparqlGraphFilter
}
