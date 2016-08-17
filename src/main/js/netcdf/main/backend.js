import 'whatwg-fetch';
import BinRaster from './models/BinRaster';

function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

export function getRaster(service, variable, date, elevation){

	let urlQuery = getUrlQuery([['service', service], ['varName', variable], ['date', date], ['elevation', elevation]]);

	return fetch('/netcdf/getSlice' + urlQuery, {
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

function getUrlQuery(keyValues){
	if(!keyValues || keyValues.length == 0) return '';

	let qParams = new URLSearchParams();
	keyValues.forEach(
		([key, value]) => qParams.append(key, value)
	);
	return '?' + qParams.toString();
}

function getJson(url, ...keyValues){

	return fetch(url + getUrlQuery(keyValues), {
		headers: {
			'Accept': 'application/json'
		}
	})
	.then(checkStatus)
	.then(response => response.json());
}

export function getServices(){
	return getJson('/netcdf/listNetCdfFiles');
}

export function getDates(service){
	return getJson('/netcdf/listDates', ['service', service]);
}

export function getVariables(service){
	return getJson('/netcdf/listVariables', ['service', service]);
}

export function getElevations(service, variable){
	return getJson('/netcdf/listElevations', ['service', service], ['varName', variable]);
}

export function getCountriesTopoJson(){
	// var url = 'https://static.icos-cp.eu/js/topojson/countries.json';
	// var url = 'https://static.icos-cp.eu/js/topojson/countries.topo.json';
	var url = 'https://static.icos-cp.eu/js/topojson/readme-world.json';
	return getJson(url);
}

