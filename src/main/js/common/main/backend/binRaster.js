import 'whatwg-fetch';
import {checkStatus} from './fetchHelp';
import BinRaster from '../dataformats/BinRaster';


export function getBinRaster(url){
	return fetch(url, {
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

