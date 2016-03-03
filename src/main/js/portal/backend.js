import 'whatwg-fetch';
import BinTable from './models/BinTable';

function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

export function getMetaData(searchObj){
	const tables = [{
		columnNames: ['RECORD', 'SWC1_IRR_Avg', 'Rnet_NCOR_Avg'],
		columnUnits: ['Time', 'mV', 'ppm'],
		request: {
			"tableId": "aaaaaaaaaaaaaaaaaaaaaa01",
			"schema": {
				"columns": ["INT", "FLOAT", "DOUBLE"],
				"size": 344
			},
			"columnNumbers": [0, 1, 2]
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

