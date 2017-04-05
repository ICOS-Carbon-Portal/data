import {sparql, getBinaryTable, tableFormatForSpecies} from 'icos-cp-backend';
import {objectSpecification} from './sparqlQueries';


function getObjInfo(config, objId){
	console.log({getObjInfo: config});
	const query = objectSpecification(config, objId);
	console.log({config, query});

	return sparql(query, config.sparqlEndpoint).then(sparqlResult => {
		const solution = sparqlResult.results.bindings[0];
		return solution
			? Promise.resolve({
				objSpec: solution.objSpec.value,
				nRows: parseInt(solution.nRows.value)
			})
			: Promise.reject(new Error(`Data object ${objId} does not exist or is not an ingested time series`));
	});
}

export function getBinTable(config, xCol, yCol, objId){
	return getObjInfo(config, objId)
		.then(
			dataObjInfo => tableFormatForSpecies(dataObjInfo.objSpec, config)
				.then(tableFormat => {return {tableFormat, nRows: dataObjInfo.nRows};})
		).then(
			({tableFormat, nRows}) => {
				const axisIndices = [xCol, yCol].map(colName => tableFormat.getColumnIndex(colName));
				const request = tableFormat.getRequest(objId, nRows, axisIndices);
				return getBinaryTable(request, '/portal/tabular');
			}
		);
}