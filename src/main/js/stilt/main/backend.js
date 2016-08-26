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

export function getStationPositions(){
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

