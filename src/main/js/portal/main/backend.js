import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import SpecTable from './models/SpecTable';
import config from '../../common/main/config';
import Cart from './models/Cart';
import 'whatwg-fetch';


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

export function fetchFilteredDataObjects(dobjRequest){
	const query = queries.listFilteredDataObjects(config, dobjRequest);

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

export const getObjColInfo = dobj => {
	const query = queries.dobjColInfo(config, dobj);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const vars = sparqlResult.head.vars;
				const bindings = sparqlResult.results.bindings;

				const colInfo = vars.map(v => {
					return {
						name: v,
						data: bindings.map(b => {
							return b[v].value === "?" ? undefined : b[v].value;
						})
					};
				});

				return bindings
					? Promise.resolve(colInfo)
					: Promise.reject(new Error("Could not find dobj " + dobj));
			}
		);
};

export const saveCart = cart => {
	return Promise.resolve(localStorage.setItem('cp-cart', JSON.stringify(cart)));
};

export const getCart = () => {
	const ls = localStorage.getItem('cp-cart');
	return Promise.resolve(new Cart().fromStorage(ls));
};

export const getIsBatchDownloadOk = ids => {
	return fetch('../objects?ids=[]&fileName=test', {credentials: 'include'})
		.then(response => response.status === 200);
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
		case "http://www.w3.org/2001/XMLSchema#dateTime": return new Date(b.value);
		default: return b.value;
	}
}
