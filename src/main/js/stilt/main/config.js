import common from '../../common/main/config';
import Dygraph from 'dygraphs';

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
}, {
	label: 'co2.energy',
	comment: 'CO2 from energy production',
	options: {axis: 'y2', color: 'rgb(197,90,17)', strokePattern: Dygraph.DASHED_LINE}
}, {
	label: 'co2.transport',
	comment: 'CO2 from transport',
	options: {axis: 'y2', color: 'rgb(255,147,0)', strokePattern: Dygraph.DASHED_LINE},
}, {
	label: 'co2.industry',
	comment: 'CO2 from industry',
	options: {axis: 'y2', color: 'rgb(255,64,255)', strokePattern: Dygraph.DASHED_LINE}
}, {
	label: 'co2.others',
	comment: 'CO2 from other categories',
	options: {axis: 'y2', color: 'rgb(216,131,255)', strokePattern: Dygraph.DASHED_LINE}
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
	primaryComponents(selectedYear){
		const obsColumns = !selectedYear || selectedYear.dataObject ? wdcggColumns.slice(1) : [];
		return obsColumns.concat(stiltResultColumns.slice(1,3));
	},
	secondaryComponents(){
		return stiltResultColumns.slice(3);
	},
	stations: [ //STILT id, STILT lat, STILT lon, ICOS short name, WDCGG name
		['BAL', 55.35, 17.22, '',       'Baltic Sea'],
		['BGU',     0,     0, '',       'Begur'],
		['BI5', 53.23, 23.03, '',       ''],
		['BSC', 44.17, 28.68, '',       ''],
		['CB1',     0,     0, 'NL-Cab', 'Cabauw 20m'],
		['CB4',     0,     0, 'NL-Cab', 'Cabauw 200m'],
		['EGH', 51.43, -0.56, '',       ''],
		['GIF', 48.71,  2.15, '',       ''],
		['HEI', 49.42,  8.67, '',       ''],
		['HPB',     0,     0, 'HPB',    'Hohenpeissenberg'],
		['HU1',     0,     0, '',       'Hegyhatsal'],
		['IPR', 45.81,  8.63, '',       ''],
		['JFJ',     0,     0, 'JFJ',    'Jungfraujoch'],
		['KAS', 49.25, 19.98, '',       ''],
		['LMP',     0,     0, 'Lmp',    'Lampedusa'],
		['LPO', 48.80, -3.58, '',       ''],
		['LU1',     0,     0, 'NL-Lut', ''],
		['MHD',     0,     0, '',       'Mace Head'],
		['OX3',     0,     0, 'OXK',    'Ochsenkopf'],
		['PAL',     0,     0, 'ATM-PAL','Pallas-Sammaltunturi'],
		['PDM',     0,     0, '',       'Pic du Midi'],
		['PUY',     0,     0, 'PUY',    'Puy de Dome'],
		['SIL',     0,     0, '',       'Schauinsland'],
		['TR2',     0,     0, 'TRN',    ''],
		['TR4',     0,     0, 'TRN',    ''],
		['TT1',     0,     0, '',       'Tacolneston Tall Tower'],
		['TT2',     0,     0, '',       'Tacolneston Tall Tower'],
		['WEY', 52.95,  1.12, 'WAO',    '']
	],
	defaultDelay: 100 //ms
})

