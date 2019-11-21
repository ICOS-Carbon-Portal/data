import {sparql, getBinaryTable, tableFormatForSpecies, TableFormat, BinTable} from 'icos-cp-backend';
import {objectSpecification, Config} from './sparqlQueries';


export function getTableFormatNrows(config: Config, objId: string){
	const query = objectSpecification(config, objId);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const solution = sparqlResult.results.bindings[0];
				return solution
					? Promise.resolve({
						objSpec: solution.objSpec.value,
						nRows: parseInt(solution.nRows.value),
						colNames: solution.colNames ? JSON.parse(solution.colNames.value) : undefined
					})
					: Promise.reject(new Error(`Data object ${objId} does not exist or is not an ingested time series`));
			}
		).then(
			({objSpec, nRows, colNames}) => tableFormatForSpecies(objSpec, config)
				.then(tableFormat => {
					return {
						tableFormat: colNames ? tableFormat.withColumnNames(colNames) : tableFormat,
						nRows
					};
				})
		);
}

export function getBinTable(objId: string, tableFormat: TableFormat, nRows: number): Promise<BinTable>{
	const axisIndices = Array.from({length: tableFormat.columns.length}, (_, i) => i);
	const request = tableFormat.getRequest(objId, nRows, axisIndices);
	return getBinaryTable(request, '/portal/tabular');
}
