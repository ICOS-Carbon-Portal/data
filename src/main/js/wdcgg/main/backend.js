import {sparql, getBinaryTable} from 'icos-cp-backend';
import * as sparqlQueries from './sparqlQueries';
import config from './config';

export function getStationInfo(){
	function floatValueOf(bindingVal){
		return bindingVal ? parseFloat(bindingVal.value) : undefined;
	}
	const query = sparqlQueries.stationInfo();
	return sparql(query, config.sparqlEndpoint, true).then(sparqlResult => {
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

	return sparql(query, config.sparqlEndpoint, true).then(sparqlResult => {
		return sparqlResult.results.bindings.map(binding => {
			return {
				prop: binding.prop ? binding.prop.value : binding.label,
				label: binding.label.value,
				value: binding.val.value
			};
		});
	});
}


export function getGlobalTimeInterval(spec){
	const query = sparqlQueries.getGlobalTimeInterval(spec);

	return sparql(query, config.sparqlEndpoint, true).then(sparqlResult => {
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

	return sparql(query, config.sparqlEndpoint, true).then(sparqlResult => {
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

	return sparql(query, config.sparqlEndpoint, true).then(sparqlResult => groupBy(
		sparqlResult.results.bindings.filter(binding => !!binding.value),
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

