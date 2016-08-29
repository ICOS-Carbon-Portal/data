import common from '../../common/main/config';

const wdcggBaseUri = 'http://meta.icos-cp.eu/resources/wdcgg/';

const stationNameProp = cpmetaProp('hasName');
const stationCountryProp = cpmetaProp('country');

export default Object.assign({}, common, {
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
});

function wdcggProp(suffix){
	return wdcggBaseUri + suffix;
}

function cpmetaProp(suffix){
	return common.cpmetaOntoUri + suffix;
}

