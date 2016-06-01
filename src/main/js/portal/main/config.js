var endpoint = 'http://127.0.0.1:9094/sparql';

// @if NODE_ENV='production'
endpoint = 'https://meta.icos-cp.eu/sparql';
// @endif

export default {
	sparqlEndpoint: endpoint,
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	wdcggProps: [
		{uri: wdcggProp('PARAMETER'),           label: 'Parameter (gas)'},
		{uri: wdcggProp('STATION+NAME'),        label: 'Station name'},
		{uri: wdcggProp('CONTRIBUTOR'),         label: 'Contributor'},
		{uri: wdcggProp('COUNTRY%2FTERRITORY'), label: 'Country'},
		{uri: wdcggProp('TIME+INTERVAL'),       label: 'Time interval'},
		{uri: wdcggProp('SAMPLING+TYPE'),       label: 'Sampling type'},
		{uri: wdcggProp('MEASUREMENT+UNIT'),    label: 'Measurement unit'}
	]
}

function wdcggProp(suffix){
	return 'http://meta.icos-cp.eu/resources/wdcgg/' + suffix;
}
