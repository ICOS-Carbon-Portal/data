import 'whatwg-fetch';
import BinTable from './models/BinTable';
import parseTableFormat from './models/TableFormat';
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

export function getTableSchema(searchObj){
	return sparql(sparqlQueries.queryTableSchema(searchObj.tableId))
		.then(response => {
			return parseTableFormat(searchObj.tableId, response);
		});
}

export function getGlobalDSMeta(searchObj) {
	return sparql(sparqlQueries.queryDatasetGlobalParams(searchObj.tableId))
		.then(response => {
			return parseTableFormat(searchObj.tableId, response);
		});
}

function dataObjectsBySpecies(objSpecies){
	const query = sparqlQueries.simpleDataObjects(objSpecies);

	return sparql(query).then(response =>
		response.bindings.map(binding => {
			return {
				id: binding.id.value,
				fileName: binding.fileName.value,
				nRows: parseInt(binding.nRows.value)
			};
		})
	);
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
		.then(response => {
			var bytes = response.arrayBuffer();
			return new BinTable(bytes, tblRequest.schema);
		});
}

