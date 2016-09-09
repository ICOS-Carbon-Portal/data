import common from '../../common/main/config';

const dateSeries = {
	label: 'isodate',
	comment: 'datetime, UTC',
	options: {axis: 'x'}
};

const stiltResultColumns = [dateSeries, {
	label: 'co2.stilt',
	comment: 'STILT-modelled CO2 mole fraction',
	options: {axis: 'y1', color: 'rgb(0,0,255)', strokeWidth: 2}
}, {
	label: 'co2.background',
	comment: 'global background CO2 mole fraction',
	options: {axis: 'y1', color: 'rgb(157,195,230)'}
}, {
	label: 'co2.bio',
	comment: 'CO2 from biospheric processes',
	options: {axis: 'y2', color: 'rgb(0,255,0)', strokeWidth: 2}
}, {
	label: 'co2.bio.gee',
	comment: 'CO2 uptake by photosynthesis',
	options: {axis: 'y2', color: 'rgb(0,144,81)'}
}, {
	label: 'co2.bio.resp',
	comment: 'CO2 release by respiration',
	options: {axis: 'y2', color: 'rgb(146,144,0)'}
}, {
	label: 'co2.fuel',
	comment: 'anthropogenic CO2 from fuel combustion',
	options: {axis: 'y2', color: 'rgb(255,0,0)', strokeWidth: 2}
}, {
	label: 'co2.fuel.oil',
	comment: 'CO2 from oil combustion',
	options: {axis: 'y2', color: 'rgb(197,90,17)'}
}, {
	label: 'co2.fuel.coal',
	comment: 'CO2 from coal combustion',
	options: {axis: 'y2', color: 'rgb(255,147,0)'},
}, {
	label: 'co2.fuel.gas',
	comment: 'CO2 from gas combustion',
	options: {axis: 'y2', color: 'rgb(255,64,255)'}
}, {
	label: 'co2.fuel.bio',
	comment: 'CO2 from biofuel combustion',
	options: {axis: 'y2', color: 'rgb(216,131,255)'}
}];

const wdcggColumns = [dateSeries, {
	label: 'co2.observed',
	comment: 'observed atmospheric CO2 mole fraction available at WDCGG',
	options: {axis: 'y1', color: 'rgb(0, 0, 0)', strokeWidth: 2}
}];

export default Object.assign({}, common, {
	wdcggBaseUri: 'http://meta.icos-cp.eu/resources/wdcgg/',
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	stiltResultColumns,
	wdcggColumns,
	primaryComponents(){
		return wdcggColumns.slice(1).concat(stiltResultColumns.slice(1,3));
	},
	secondaryComponents(){
		return stiltResultColumns.slice(3);
	},
	stations: [
		{id: 'JFJ', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20'},
		{id: 'MHD', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Mace%20Head%20'},
		{id: 'PAL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Pallas-Sammaltunturi%20'},
		{id: 'SIL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Schauinsland%20'}
	]
})

