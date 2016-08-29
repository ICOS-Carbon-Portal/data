import 'whatwg-fetch';
import {sparql} from '../../common/main/backend/sparql';
import {getBinaryTable} from '../../common/main/backend/binTable';
import * as sparqlQueries from './sparqlQueries';
import config from './config';


export function getStationInfo(){
	return Promise.resolve([
		{
			id: 'JFJ',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20',
			name: 'Jungfraujoch',
			years: [{
				year: 2011,
				dataObject: {id: 'https://meta.icos-cp.eu/objects/CKuB_hK4-1g3PB1lyPjrZMM3', nRows: 8760}
			}],
			lat: 46.55,
			lon: 7.98
		},
		{
			id: 'MHD',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Mace%20Head%20',
			name: 'Mace Head',
			years: [{
				year: 2011,
				dataObject: {id: 'https://meta.icos-cp.eu/objects/epSW2GnzRlSmsSL76oylJnG1', nRows: 8760}
			}],
			lat: 53.33,
			lon: 9.9
		}
	]);

	const query = sparqlQueries.stationPositions();
	return sparql(query).then(sparqlResult => {
		//TODO: Remove filter when sparql only returns stations with position
		return sparqlResult.results.bindings.filter(binding => binding.lat && binding.lon).map(binding => {
			return {
				uri: binding.station.value,
				name: binding.name.value,
				lat: parseFloat(binding.lat.value),
				lon: parseFloat(binding.lon.value)
			}
		})
	});
}

export function getWdcggBinaryTable(wdcggFormat, dataObjectInfo){
	const axisIndices = ['TIMESTAMP', 'PARAMETER'].map(idx => wdcggFormat.getColumnIndex(idx));
	const tblRequest = wdcggFormat.getRequest(dataObjectInfo.id, dataObjectInfo.nRows, axisIndices);

	return getBinaryTable(tblRequest);
}

