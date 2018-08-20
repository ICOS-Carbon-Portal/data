import 'babel-polyfill';
import {sparql, getBinaryTable, tableFormatForSpecies} from 'icos-cp-backend';
import {objectSpecification} from './sparqlQueries';


export function getTableFormatNrows(config, objIds){
	const query = objectSpecification(config, objIds);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;
				return bindings
					? Promise.resolve(bindings.map(binding => {
						return {
							id: binding.obj.value,
							objSpec: binding.objSpec.value,
							nRows: parseInt(binding.nRows.value),
							filename: binding.fileName.value
						}
					}))
					: Promise.reject(new Error(`Data object ${objIds.join()} does not exist or is not an ingested time series`));
			}
		).then(objects => tableFormatForSpecies(objects[0].objSpec, config)
			.then(tableFormat => [tableFormat, objects])
		);
}

export function getBinTable(xCol, yCol, objId, tableFormat, nRows){
	const axisIndices = [xCol, yCol].map(colName => tableFormat.getColumnIndex(colName));
	const request = tableFormat.getRequest(objId, nRows, axisIndices);
	return getBinaryTable(request, '/portal/tabular');
}
