
var endpoint = 'https://meta.icos-cp.eu/sparql';

const envri = typeof location !== 'undefined' && location.host.indexOf('fieldsites.se') >= 0 ? 'SITES' : 'ICOS';
const host = envri === 'SITES' ? 'meta.fieldsites.se' : 'meta.icos-cp.eu';
const sparqlGraphFilter = envri === 'SITES' ? 'https://meta.fieldsites.se/' : 'http://meta.icos-cp.eu/';

export default {
	sparqlEndpoint: endpoint,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	cpmetaObjectUri: `https://${host.replace('local-', '')}/objects/`,
	envri,
	sparqlGraphFilter
}
