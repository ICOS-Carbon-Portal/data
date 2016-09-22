import 'whatwg-fetch';
import {checkStatus} from '../../common/main/backend/fetchHelp';
import {sparql} from '../../common/main/backend/sparql';
import {getJson} from '../../common/main/backend/json';
import {getBinaryTable} from '../../common/main/backend/binTable';
import {getBinRaster} from '../../common/main/backend/binRaster';
import {tableFormatForSpecies} from '../../common/main/backend/tableFormat';
import {stationInfoQuery} from './sparqlQueries';
import groupBy from '../../common/main/general/groupBy';
import copyprops from '../../common/main/general/copyprops';
import distinct from '../../common/main/general/distinct';

//import * as sparqlQueries from './sparqlQueries';
import config from './config';

export function getInitialData(){
	return Promise.all([
		tableFormatForSpecies(config.wdcggSpec),
		getStationInfo(),
		getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
	]).then(([wdcggFormat, stations, countriesTopo]) => {return {wdcggFormat, stations, countriesTopo};});
}

function getStationInfo(){
	return Promise.all([
		sparql(stationInfoQuery),
		getJson('stationyears')
	]).then(([sparqlResult, stationYears]) => {

		const flatInfo = sparqlResult.results.bindings.map(binding => {
			const year = binding.ackStartTime && binding.ackEndTime
				? new Date(new Date(binding.ackStartTime.value).valueOf() / 2 + new Date(binding.ackEndTime.value).valueOf() / 2).getUTCFullYear()
				: undefined;
			return {
				id: binding.stiltId.value,
				name: binding.stationName.value.trim(),
				lat: parseFloat(binding.lat.value),
				lon: parseFloat(binding.lon.value),
				year,
				nRows: binding.nRows ? parseInt(binding.nRows.value) : undefined,
				dobj: binding.dobj ? binding.dobj.value : undefined
			};
		}).filter(({id, year}) => stationYears[id] && stationYears[id].length > 0 &&
				(!year || stationYears[id].indexOf(year) >= 0)
		);

		const byId = groupBy(flatInfo, info => info.id);

		return Object.keys(byId).map(id => {
			const dataObjs = byId[id];

			const byYear = groupBy(
				dataObjs.filter(dobj => dobj.year),
				dobj => dobj.year
			);

			const years = stationYears[id].sort().map(year => {

				const dobjs = (byYear[year] || [])
					.map(({dobj, nRows}) => {return {id: dobj, nRows};})
					.sort((do1, do2) => do2.nRows - do1.nRows); //by number of points, descending

				return {year, dataObject: dobjs[0]};//picking the observation with largest number of points
			});

			return Object.assign(copyprops(dataObjs[0], ['id', 'name', 'lat', 'lon']), {years});
		});
	});
}

export function getRaster(stationId, filename){
	const id = stationId + filename;
	return getBinRaster(id, 'footprint', ['stationId', stationId], ['footprint', filename]);
}

export function getStationData(stationId, year, dataObjectInfo, wdcggFormat){
	//stationId: String, year: Int, dataObjectInfo: {id: String, nRows: Int}, wdcggFormat: TableFormat
	const footprintsListPromise = getFootprintsList(stationId, year);
	const observationsPromise = getWdcggBinaryTable(dataObjectInfo, wdcggFormat);
	const modelResultsPromise = getStiltResults({
		stationId,
		year,
		columns: config.stiltResultColumns.map(series => series.label)
	});

	return Promise.all([observationsPromise, modelResultsPromise, footprintsListPromise])
		.then(([obsBinTable, modelResults, footprints]) => {return {obsBinTable, modelResults, footprints};});
}

function getWdcggBinaryTable(dataObjectInfo, wdcggFormat){
	if(!dataObjectInfo) return Promise.resolve(null);

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

function getFootprintsList(stationId, year){
	return getJson('listfootprints', ['stationId', stationId], ['year', year]);
}

