
//var endpoint = 'http://127.0.0.1:9094/sparql';
var endpoint = 'https://meta.icos-cp.eu/sparql';

// @if NODE_ENV='production'
// endpoint = 'https://meta.icos-cp.eu/sparql';
// @endif


export default {
	sparqlEndpoint: endpoint,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	cpmetaObjectUri: 'http://meta.icos-cp.eu/resources/cpmeta/'
}

