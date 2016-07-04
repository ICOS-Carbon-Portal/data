import 'whatwg-fetch';
import BinTable from './models/BinTable';
import {parseTableFormat, parseFormat} from './models/TableFormat';
import * as sparqlQueries from './sparqlQueries';
import config from './config';

function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

function sparql(query){
	return fetch(config.sparqlEndpoint, {
			method: 'post',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'text/plain'
			},
			body: query
		})
		.then(checkStatus)
		.then(response => response.json());
}

export function tableFormatForSpecies(objSpecies){
	const query = sparqlQueries.simpleObjectSchema(objSpecies);
	return sparql(query).then(parseTableFormat);
}

export function getStationInfo(){
	function floatValueOf(bindingVal){
		return bindingVal ? parseFloat(bindingVal.value) : undefined;
	}
	const query = sparqlQueries.stationInfo();
	return sparql(query).then(sparqlResult => {
		return sparqlResult.results.bindings.map(binding => {
			return {
				uri: binding.station.value,
				name: binding.name.value,
				country: binding.country.value,
				lat: floatValueOf(binding.lat),
				lon: floatValueOf(binding.lon)
			}
		})
	});
}

export function getDataObjectData(dobjId, tblRequest){
	return Promise.all([
		getFormatSpecificProps(dobjId),
		getBinaryTable(tblRequest)
	]).then(([format, binTable]) => {
		return {format, binTable};
	});
}

function getFormatSpecificProps(dobjId){
	const query = sparqlQueries.formatSpecificProps(dobjId);

	return sparql(query).then(sparqlResult => {
		return sparqlResult.results.bindings.map(binding => {
			return {
				prop: binding.prop ? binding.prop.value : binding.label,
				label: binding.label.value,
				value: binding.val.value
			};
		});
	});
}

function getBinaryTable(tblRequest){
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
			return new BinTable(response, tblRequest.returnedTableSchema);
		});
}

export function getGlobalTimeInterval(spec){
	const query = sparqlQueries.getGlobalTimeInterval(spec);

	return sparql(query).then(sparqlResult => {
		const binding = sparqlResult.results.bindings[0];

		return !binding
			? Promise.reject(
				new Error(`Got empty reply for min and max timestamps of ${spec} datasets`)
			)
			: {
				min: binding.startMin.value,
				max: binding.endMax.value
			};
	});
}

export function getFilteredPropValueCounts(spec, filters){
	return Promise.all([
		getPropValueCounts(spec, filters),
		getFilteredDataObjects(spec, filters)
	]).then(([propValCount, filteredDataObjects]) => {
		return {propValCount, filteredDataObjects};
	});
}

function getFilteredDataObjects(spec, filters){
	const query = sparqlQueries.getFilteredDataObjQuery(spec, filters);

	return sparql(query).then(sparqlResult => {
		return sparqlResult.results.bindings.map(binding => {
			return {
				uri: binding.dobj.value,
				fileName: binding.fileName.value,
				nRows: Number.parseInt(binding.nRows.value)
			};
		});
	});
}

function getPropValueCounts(spec, filters){
	const query = sparqlQueries.getPropValueCounts(spec, filters);

	function bindingToValueCount(binding){
		return {
			value: binding.value.value,
			count: Number.parseInt(binding.count.value)
		};
	}

	return sparql(query).then(sparqlResult => groupBy(
		sparqlResult.results.bindings,
		binding => binding.prop.value,
		bindingToValueCount
	));
}

function groupBy(arr, keyMaker, valueMaker){
	return arr.reduce(function(acc, elem){
		const key = keyMaker(elem);
		const value = valueMaker(elem);

		if(acc.hasOwnProperty(key)) acc[key].push(value)
		else acc[key] = [value];

		return acc;
	}, {});
}
