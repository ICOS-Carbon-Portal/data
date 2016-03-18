import 'whatwg-fetch';
import BinTable from './models/BinTable';

function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

export function getMetaData(searchObj){
	const tables = [{
		columnNames: ['DATE', 'PARAMETER', 'SD', 'TIME', 'TIMESTAMP'],
		columnUnits: ['date', 'ppm', 'ppm', 'time', 'ms since epoch'],
		request: {
			"tableId": "IjFdgIJ7gEqJDBxB-r8N06jW",
			"schema": {
				"columns": ["INT", "FLOAT", "FLOAT", "INT", "DOUBLE"],
				"size": 15341
			},
			"columnNumbers": [0, 1, 2, 3, 4]
		}
	}];

	return new Promise(function(resolve, reject){
			resolve(tables);
		})
		.then(response => {
			return response;
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

