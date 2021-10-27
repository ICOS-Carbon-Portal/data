import {sparql, getBinaryTable, TableFormat} from 'icos-cp-backend';
import {objectSpecification, ObjectSpecConfig} from '../../common/main/sparqlQueries';
import TableFormatCache from "../../common/main/TableFormatCache";

export function getTableFormatNrows(config: ObjectSpecConfig, objIds: string[]){
	const query = objectSpecification(config, objIds);
	const tfCache = new TableFormatCache(config);

	return sparql(query, config.sparqlEndpoint, true)
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
							columnNames: binding.columnNames ? JSON.parse(binding.columnNames.value) as string[] : undefined,
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

					return {...{tableFormat}, ...object}
				})
			)
		);
}

export function getBinTable(xCol: string, yCol: string, objId: string, tableFormat: TableFormat, nRows: number, y2Col?: string){
	const cols = y2Col ? [xCol, yCol, y2Col] : [xCol, yCol];
	const axisIndices = cols.map(colName => tableFormat.getColumnIndex(colName));

	if (axisIndices.includes(-1)) return;

	const request = tableFormat.getRequest(objId, nRows, axisIndices);

	return getBinaryTable(request, '/cpb', tableFormat.flagGoodness);
}
