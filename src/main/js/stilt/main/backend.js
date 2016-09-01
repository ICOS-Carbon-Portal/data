import 'whatwg-fetch';
import {checkStatus} from '../../common/main/backend/fetchHelp';
import {sparql} from '../../common/main/backend/sparql';
import {getBinaryTable} from '../../common/main/backend/binTable';
import {getBinRaster} from '../../common/main/backend/binRaster';
import * as sparqlQueries from './sparqlQueries';
import config from './config';


export function getStationInfo(){
	return Promise.resolve([
		{
			id: 'JFJ',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Jungfraujoch%20',
			name: 'Jungfraujoch',
			years: [{
				year: 2011,
				dataObject: {id: 'https://meta.icos-cp.eu/objects/CKuB_hK4-1g3PB1lyPjrZMM3', nRows: 8760}
			}],
			lat: 46.55,
			lon: 7.98
		},
		{
			id: 'MHD',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Mace%20Head%20',
			name: 'Mace Head',
			years: [{
				year: 2011,
				dataObject: {id: 'https://meta.icos-cp.eu/objects/epSW2GnzRlSmsSL76oylJnG1', nRows: 8760}
			}],
			lat: 53.33,
			lon: -9.9
		},
		{
			id: 'PAL',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Pallas-Sammaltunturi%20',
			name: 'Pallas-Sammaltunturi',
			years: [{
				year: 2011,
				dataObject: {id: 'https://meta.icos-cp.eu/objects/43UW3Nr00WbjDi1zVZa187AJ', nRows: 8760}
			}],
			lat: 67.97,
			lon: 24.12
		},
		{
			id: 'SIL',
			uri: 'http://meta.icos-cp.eu/resources/wdcgg/station/Schauinsland%20',
			name: 'Schauinsland',
			years: [{
				year: 2011,
				dataObject: {id: 'https://meta.icos-cp.eu/objects/S9HFnhr7lF4D4Xl-sKTN4VTk', nRows: 8760}
			}],
			lat: 47.92,
			lon: 7.92
		}
	]);

/*
	const query = sparqlQueries.stationPositions();
	return sparql(query).then(sparqlResult => {
		return sparqlResult.results.bindings.map(binding => {
			return {
				uri: binding.station.value,
				name: binding.name.value,
				lat: parseFloat(binding.lat.value),
				lon: parseFloat(binding.lon.value)
			}
		})
	});
*/
}

export function getTimeSeries(stationId, year, dataObjectInfo, wdcggFormat){
	//stationId: String, year: Int
	//dataObjectInfo: {id: String, nRows: Int}
	//wdcggFormat: TableFormat

	const observationsPromise = getWdcggBinaryTable(dataObjectInfo, wdcggFormat);
	const modelResultsPromise = getStiltResults({
		stationId,
		year,
		columns: config.stiltResultColumns
	});

	return Promise.all([observationsPromise, modelResultsPromise])
		.then(([obsBinTable, modelResults]) => {return {obsBinTable, modelResults};});
}

function getWdcggBinaryTable(dataObjectInfo, wdcggFormat){
	const axisIndices = ['TIMESTAMP', 'PARAMETER'].map(idx => wdcggFormat.getColumnIndex(idx));
	const tblRequest = wdcggFormat.getRequest(dataObjectInfo.id, dataObjectInfo.nRows, axisIndices);

	return getBinaryTable(tblRequest);
}

function getStiltResults(resultsRequest){
	return fetch('stiltresult', {
		method: 'POST',
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(resultsRequest)
	})
	.then(checkStatus)
	.then(response => response.json());
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

export function getCountriesTopoJson(){
	var url = 'https://static.icos-cp.eu/js/topojson/readme-world.json';
	return getJson(url);
}

export function getRaster(){
	return getBinRaster('/netcdf/getSlice?service=foot2007x01x01x00x46.55Nx007.98Ex00720_aggreg.nc&varName=foot&date=2006-12-22T00%3A00%3A00Z&elevation=null');
}

