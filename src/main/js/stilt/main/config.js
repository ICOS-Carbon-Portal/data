import common from '../../common/main/config';

const [dateColumn, observedCo2Column] = ['isodate', 'co2.observed'];
const primaryAxisStilt = ['co2.total', 'co2.ini'];
const secondaryAxisStilt = ['co2.bio', 'gee.all', 'resp.all', 'co2.fuel', 'co2.cat.fuel.oil', 'co2.cat.fuel.coal', 'co2.cat.fuel.gas', 'co2.cat.fuel.bio'];

export default Object.assign({}, common, {
	wdcggBaseUri: 'http://meta.icos-cp.eu/resources/wdcgg/',
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	stiltResultColumns: [dateColumn].concat(primaryAxisStilt, secondaryAxisStilt),
	primaryAxisColumns: [observedCo2Column].concat(primaryAxisStilt),
	wdcggColumns: [dateColumn, observedCo2Column],
	stations: [
		{id: 'JFJ', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20'},
		{id: 'MHD', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Mace%20Head%20'},
		{id: 'PAL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Pallas-Sammaltunturi%20'},
		{id: 'SIL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Schauinsland%20'}
	]
})

