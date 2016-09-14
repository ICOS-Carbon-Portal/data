import 'whatwg-fetch';
import {checkStatus, getUrlQuery} from './fetchHelp';

export function getJson(url, ...keyValues){
	return fetch(url + getUrlQuery(keyValues), {
			headers: {
				'Accept': 'application/json'
			}
		})
		.then(checkStatus)
		.then(response => response.json());
}

