import 'whatwg-fetch';
import {checkStatus, getUrlQuery} from './fetchHelp';
import BinRaster from '../dataformats/BinRaster';


export function getBinRaster(url, ...keyValues){
	return fetch(url + getUrlQuery(keyValues), {
			headers: {
				'Accept': 'application/octet-stream'
			}
		})
		.then(checkStatus)
		.then(response => response.arrayBuffer())
		.then(response => {
			return new BinRaster(response);
		});
}

