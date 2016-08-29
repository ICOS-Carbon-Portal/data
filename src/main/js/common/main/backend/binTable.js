import 'whatwg-fetch';
import {checkStatus} from './fetchHelp';
import BinTable from '../dataformats/BinTable';


export function getBinaryTable(tblRequest){
	return fetch('/portal/tabular', {
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

