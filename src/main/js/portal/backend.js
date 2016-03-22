import 'whatwg-fetch';
import BinTable from './models/BinTable';
import TableFormat from './models/TableFormat';
import * as sparqlQueries from './sparqlQueries';
import config from './config';

function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

export function getTableSchema(searchObj){
	return fetch(config.sparqlEndpoint, {
			method: 'post',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'text/plain'
			},
			body: sparqlQueries.queryTableSchema(searchObj.tableId)
		})
		.then(checkStatus)
		.then(response => response.json())
		.then(response => {
			return new TableFormat(searchObj.tableId, response).table;
		});
}

export function getGlobalDSMeta(searchObj) {
	return fetch(config.sparqlEndpoint, {
		method: 'post',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'text/plain'
		},
		body: sparqlQueries.queryDatasetGlobalParams(searchObj.tableId)
	})
		.then(checkStatus)
		.then(response => response.json())
		.then(response => {
			return new TableFormat(searchObj.tableId, response).table;
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
			return new BinTable(response, tblRequest.schema);
		});
}

