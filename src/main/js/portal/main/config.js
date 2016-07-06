var endpoint = 'http://127.0.0.1:9094/sparql';

// @if NODE_ENV='production'
endpoint = 'https://meta.icos-cp.eu/sparql';
// @endif

const wdcggBaseUri = 'http://meta.icos-cp.eu/resources/wdcgg/';
const cpmetaOntoUri = 'http://meta.icos-cp.eu/ontologies/cpmeta/';

const stationNameProp = cpmetaProp('hasName');
const stationCountryProp = cpmetaProp('country');

export default {
	sparqlEndpoint: endpoint,
	cpmetaOntoUri,
	cpmetaResUri: 'http://meta.icos-cp.eu/resources/cpmeta/',
	wdcggBaseUri,
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	filteringWidgets: [
		{prop: stationNameProp,                  label: 'Station name'},
		{prop: stationCountryProp,               label: 'Country'},
		{prop: wdcggProp('PARAMETER'),           label: 'Parameter (gas)'},
		{prop: wdcggProp('CONTRIBUTOR'),         label: 'Contributor'},
		{prop: wdcggProp('TIME%20INTERVAL'),     label: 'Time interval'},
		{prop: wdcggProp('SAMPLING%20TYPE'),     label: 'Sampling type'},
		{prop: wdcggProp('MEASUREMENT%20UNIT'),  label: 'Measurement unit'}
	],
	stationProp: wdcggProp("STATION"),
	latProp: wdcggProp("LATITUDE"),
	lonProp: wdcggProp("LONGITUDE"),
	stationNameProp,
	stationCountryProp,
	fromDateProp: "DATE_FROM",
	toDateProp: "DATE_TO",
	initSpatialModeAllStations: false
}

function wdcggProp(suffix){
	return wdcggBaseUri + suffix;
}

function cpmetaProp(suffix){
	return cpmetaOntoUri + suffix;
}

