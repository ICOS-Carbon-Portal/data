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
							id: binding.dobj.value,
							objSpec: binding.objSpec.value,
							nRows: parseInt(binding.nRows.value),
							filename: binding.fileName.value,
							specLabel: binding.specLabel.value,
							columnNames: binding.columnNames ? JSON.parse(binding.columnNames.value) : undefined,
						}
					}))
					: Promise.reject(new Error(`Data object ${objIds.join()} does not exist or is not an ingested time series`));
			}
		).then(objects => Promise.all(objects.map(object => tableFormatForSpecies(object.objSpec, config)))
			.then(tableFormats => {
				objects.map((object, index) => {
					object.tableFormat = object.columnNames ? tableFormats[index].withColumnNames(object.columnNames) : tableFormats[index]
				})
				return objects;
			})
		);
}

export function getBinTable(xCol, yCol, objId, tableFormat, nRows){
	const axisIndices = [xCol, yCol].map(colName => tableFormat.getColumnIndex(colName));
	const request = tableFormat.getRequest(objId, nRows, axisIndices);
	return getBinaryTable(request, '/portal/tabular');
}
