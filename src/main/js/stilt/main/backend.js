import 'whatwg-fetch';
import BinTable from '../../common/main/dataformats/BinTable';
import {parseTableFormat} from '../../common/main/dataformats/TableFormat';
import * as sparqlQueries from './sparqlQueries';
import config from './config';

function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

function sparql(query){
	return fetch(config.sparqlEndpoint, {
			method: 'post',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'text/plain'
			},
			body: query
		})
		.then(checkStatus)
		.then(response => response.json());
}



export function tableFormatForSpecies(objSpecies){
	const query = sparqlQueries.simpleObjectSchema(objSpecies);
	return sparql(query).then(parseTableFormat);
}

export function getStationInfo(){
	return Promise.resolve([
		{
			id: 'JFJ',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20',
			name: 'Jungfraujoch',
			years: [{
				year: 2011,
				dataObject: {uri: 'https://meta.icos-cp.eu/objects/CKuB_hK4-1g3PB1lyPjrZMM3', nRows: 8760}
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
				dataObject: {uri: 'https://meta.icos-cp.eu/objects/epSW2GnzRlSmsSL76oylJnG1', nRows: 8760}
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

export function getBinaryTable(tblRequest){
	return fetch('tabular', {
			method: 'post',
			headers: {
				'Accept': 'application/octet-stream',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(tblRequest)
		})
		.then(checkStatus)
		.then(response => response.arrayBuffer())
		.then(response => {
			return new BinTable(response, tblRequest.returnedTableSchema);
		});
}

