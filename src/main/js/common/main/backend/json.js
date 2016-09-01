import 'whatwg-fetch';
import {checkStatus} from './fetchHelp';

export function getJson(url, ...keyValues){
	return fetch(url + getUrlQuery(keyValues), {
			headers: {
				'Accept': 'application/json'
			}
		})
		.then(checkStatus)
		.then(response => response.json());
}


function getUrlQuery(keyValues){
	return !keyValues || keyValues.length == 0
		? ''
		: '?' + keyValues.map(
			([key, value]) => key + '=' + encodeURIComponent(value)
		).join('&');
}

