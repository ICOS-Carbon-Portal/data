var endpoint = 'http://127.0.0.1:9094/sparql';

// @if NODE_ENV='production'
endpoint = 'https://meta.icos-cp.eu/sparql';
// @endif

const wdcggBaseUri = 'http://meta.icos-cp.eu/resources/wdcgg/';
const wdcggStationProp = wdcggProp('STATION%20NAME');

export default {
	sparqlEndpoint: endpoint,
	cpmetaOntoUri: 'http://meta.icos-cp.eu/ontologies/cpmeta/',
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	wdcggBaseUri,
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	wdcggProps: [
		{uri: wdcggProp('PARAMETER'),           label: 'Parameter (gas)'},
//		{uri: wdcggStationProp,                 label: 'Station name'},
		{uri: wdcggProp('CONTRIBUTOR'),         label: 'Contributor'},
//		{uri: wdcggProp('COUNTRY/TERRITORY'),   label: 'Country'},
		{uri: wdcggProp('TIME%20INTERVAL'),     label: 'Time interval'},
		{uri: wdcggProp('SAMPLING%20TYPE'),     label: 'Sampling type'},
		{uri: wdcggProp('MEASUREMENT%20UNIT'),  label: 'Measurement unit'}
	],
	wdcggStationProp,
	wdcggLatProp: wdcggProp('LATITUDE'),
	wdcggLonProp: wdcggProp('LONGITUDE'),
	fromDateProp: "DATE_FROM",
	toDateProp: "DATE_TO",
	spatialStationProp: "STATION_NAME",
	initSpatialModeAllStations: false
}

function wdcggProp(suffix){
	return wdcggBaseUri + suffix;
}

