var endpoint = 'http://127.0.0.1:9094/sparql';

// @if NODE_ENV='production'
endpoint = 'https://meta.icos-cp.eu/sparql';
// @endif

export default {
	sparqlEndpoint: endpoint,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	wdcggBaseUri: 'http://meta.icos-cp.eu/resources/wdcgg/',
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	stations: [
		{id: 'JFJ', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20'},
		{id: 'MHD', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Mace%20Head%20'},
		{id: 'PAL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Pallas-Sammaltunturi%20'},
		{id: 'SIL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Schauinsland%20'}
	]
}

