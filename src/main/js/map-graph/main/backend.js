import 'babel-polyfill';
import {sparql, getBinaryTable, tableFormatForSpecies} from 'icos-cp-backend';
import {objectSpecification} from './sparqlQueries';


export function getTableFormatNrows(config, objId){
	const query = objectSpecification(config, objId);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const solution = sparqlResult.results.bindings[0];
				return solution
					? Promise.resolve({
						objSpec: solution.objSpec.value,
						nRows: parseInt(solution.nRows.value)
					})
					: Promise.reject(new Error(`Data object ${objId} does not exist or is not an ingested time series`));
			}
		).then(
			({objSpec, nRows}) => tableFormatForSpecies(objSpec, config)
				.then(tableFormat => {return {tableFormat, nRows};})
		);
}

export function getBinTable(objId, tableFormat, nRows){
	const axisIndices = Array.from({length: tableFormat._columnsInfo.length}, (_, i) => i);
	// const axisIndices = ['Latitude', 'Longitude'].map(colName => tableFormat.getColumnIndex(colName));
	const request = tableFormat.getRequest(objId, nRows, axisIndices);
	return getBinaryTable(request, '/portal/tabular');
}
