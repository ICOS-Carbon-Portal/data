import {sparql, getBinaryTable, TableFormat} from 'icos-cp-backend';
import {objectSpecification, Config} from './sparqlQueries';
import TableFormatCache from "./TableFormatCache";

export function getTableFormatNrows(config: Config, objIds: string[]){
	const query = objectSpecification(config, objIds);
	const tfCache = new TableFormatCache(config);

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
							startedAtTime: binding.startedAtTime.value,
							columnNames: binding.columnNames ? JSON.parse(binding.columnNames.value) : undefined,
						}
					}))
					: Promise.reject(new Error(`Data object ${objIds.join()} does not exist or is not an ingested time series`));
			}
		)
		.then(objects => Promise
			.all(objects.map(object => tfCache.getTableFormat(object.objSpec)))
			.then(tableFormats =>
				objects.map((object, index) => {
					const tableFormat = object.columnNames ? tableFormats[index].withColumnNames(object.columnNames) : tableFormats[index];
					return Object.assign({tableFormat}, object)
				})
			)
		);
}

export function getBinTable(xCol: string, yCol: string, objId: string, tableFormat: TableFormat, nRows: number){
	const axisIndices = [xCol, yCol].map(colName => tableFormat.getColumnIndex(colName));
	const request = tableFormat.getRequest(objId, nRows, axisIndices);
	return getBinaryTable(request, '/portal/tabular', tableFormat.flagGoodness);
}
