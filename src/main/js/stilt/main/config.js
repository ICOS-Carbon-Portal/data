import common from '../../common/main/config';

const totalCo2Column = 'co2.total';

export default Object.assign({}, common, {
	wdcggBaseUri: 'http://meta.icos-cp.eu/resources/wdcgg/',
	wdcggSpec: 'http://meta.icos-cp.eu/resources/cpmeta/wdcggDataObject',
	stiltResultColumns: ['isodate','co2.bio', 'co2.fuel', totalCo2Column],
	totalCo2Column,
	stations: [
		{id: 'JFJ', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20'},
		{id: 'MHD', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Mace%20Head%20'},
		{id: 'PAL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Pallas-Sammaltunturi%20'},
		{id: 'SIL', uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Schauinsland%20'}
	]
})

