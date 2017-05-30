import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import SpecTable from './models/SpecTable';
import config from '../../common/main/config';

export function fetchAllSpecTables() {
	return Promise.all(
		[queries.specBasics, queries.specColumnMeta, queries.dobjOriginsAndCounts]
			.map(qf => fetchSpecTable(qf, config))
	).then(
		([basics, columnMeta, origins]) => {
			return {basics, columnMeta, origins};
		}
	);
};

function fetchSpecTable(queryFactory) {
	const query = queryFactory(config);

	return sparql(query, config.sparqlEndpoint)
		.then(sparqlResultToSpecTable);
}


export function fetchFilteredDataObjects(specs, stations, limit, offset){
	const query = queries.listFilteredDataObjects(config, specs, stations, limit, offset);

	return sparql(query, config.sparqlEndpoint)
		.then(sparqlResultToColNamesAndRows);
}


export const searchDobjs = search => {
	const query = queries.findDobjs(config, search);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => b.dobj.value.split('/').pop()))
					: Promise.reject(new Error("Could not get dobjs from meta"));
			}
		);
};


export const searchStations = search => {
	const query = queries.findStations(config, search);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => b.Long_name.value))
					: Promise.reject(new Error("Could not get stations from meta"));
			}
		);
};


function sparqlResultToColNamesAndRows(sparqlResult) {
	const columnNames = sparqlResult.head.vars;

	const rows = sparqlResult.results.bindings.map(b => {
		const row = {};
		columnNames.forEach(colName => row[colName] = sparqlBindingToValue(b[colName]));
		return row;
	});

	return {columnNames, rows};
}

function sparqlResultToSpecTable(sparqlResult) {
	const {columnNames, rows} = sparqlResultToColNamesAndRows(sparqlResult);
	return new SpecTable(columnNames, rows);
}

function sparqlBindingToValue(b){
	if(!b) return undefined;
	switch(b.datatype){
		case "http://www.w3.org/2001/XMLSchema#integer": return parseInt(b.value);
		case "http://www.w3.org/2001/XMLSchema#float": return parseFloat(b.value);
		case "http://www.w3.org/2001/XMLSchema#double": return parseFloat(b.value);
		default: return b.value;
	}
}


