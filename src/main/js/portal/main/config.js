var endpoint = 'http://127.0.0.1:9094/sparql';

// @if NODE_ENV='production'
endpoint = 'https://meta.icos-cp.eu/sparql';
// @endif

const wdcggBaseUri = 'http://meta.icos-cp.eu/resources/wdcgg/';
const cpmetaOntoUri = 'http://meta.icos-cp.eu/ontologies/cpmeta/';

export default {
	sparqlEndpoint: endpoint,
	cpmetaOntoUri,
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	wdcggBaseUri,
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	wdcggProps: [
		{uri: wdcggProp('PARAMETER'),           label: 'Parameter (gas)'},
		{uri: wdcggProp('CONTRIBUTOR'),         label: 'Contributor'},
		{uri: wdcggProp('TIME%20INTERVAL'),     label: 'Time interval'},
		{uri: wdcggProp('SAMPLING%20TYPE'),     label: 'Sampling type'},
		{uri: wdcggProp('MEASUREMENT%20UNIT'),  label: 'Measurement unit'}
	],
//	cpmetaProps: [
//		{uri: stationNameProp, label: 'Station name'},
//		{uri: stationCountryProp, label: 'Country'},
//	],
	stationProp: wdcggProp("STATION"),
	stationNameProp: cpmetaProp('hasName'),
	stationCountryProp: cpmetaProp('country'),
	fromDateProp: "DATE_FROM",
	toDateProp: "DATE_TO",
	spatialStationProp: "STATION_NAME",
	initSpatialModeAllStations: false
}

function wdcggProp(suffix){
	return wdcggBaseUri + suffix;
}

function cpmetaProp(suffix){
	return cpmetaOntoUri + suffix;
}

