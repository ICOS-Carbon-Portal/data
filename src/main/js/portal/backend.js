import 'whatwg-fetch';
import BinTable from './models/BinTable';
import {parseTableFormat} from './models/TableFormat';
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

function dataObjectsOfSpecies(objSpecies){
	const query = sparqlQueries.simpleDataObjects(objSpecies);

	return sparql(query).then(response =>
		response.results.bindings.map(binding => {
			return {
				id: binding.id.value,
				fileName: binding.fileName.value,
				nRows: parseInt(binding.nRows.value)
			};
		}).sort((o1, o2) => Math.sign(o2.nRows - o1.nRows))
	);
}

function tableFormatForSpecies(objSpecies){
	const query = sparqlQueries.simpleObjectSchema(objSpecies);
	return sparql(query).then(parseTableFormat);
}

export function getMetaForObjectSpecies(objSpecies){
	return Promise.all([
		dataObjectsOfSpecies(objSpecies),
		tableFormatForSpecies(objSpecies)
	]).then(([dataObjects, tableFormat]) => {
		return {dataObjects, tableFormat};
	});
}

function getStandardDataObjMeta(dobjId) {
	return sparql(sparqlQueries.standardDataObjProps(dobjId))
		.then(response => {
			const bindings = response.results.bindings;
			const metaFound = bindings.length == 1;
			return null;
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

