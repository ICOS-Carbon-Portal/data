import {sparql, getBinaryTable, tableFormatForSpecies} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import config from '../../common/main/config';


export const fetchStationMeasurement = (stationId, valueType) => {
	const query = queries.listStationMeasurement(config, stationId);

	return sparql({text: query}, config.sparqlEndpoint, true)
		.then(sparqlResult => {
			const bindings = sparqlResult.results.bindings;

			return bindings
				? Promise.resolve(bindings.map(binding => {
					return {
						station: binding.station.value,
						dataEnd: new Date(binding.dataEnd.value),
						dobj: binding.dobj.value,
						columnName: binding.columnName.value,
						samplingHeight: Number(binding.samplingHeight.value),
						level: Number(binding.level.value)
					}
				}))
				: Promise.reject(new Error(`Could not get station measurements for stationId = ${stationId}, valueType = ${valueType}`));
		});
};

export const fetchObjectSpecifications = objIds => {
	const query = queries.objectSpecifications(config, objIds);

	return sparql({text: query}, config.sparqlEndpoint, true)
		.then(sparqlResult => {
			const bindings = sparqlResult.results.bindings;
			return bindings.length
				? Promise.resolve(bindings.map(binding => {
					return {
						id: binding.dobj.value,
						objSpec: binding.objSpec.value,
						nRows: parseInt(binding.nRows.value),
						filename: binding.fileName.value,
						specLabel: binding.specLabel.value,
						level: parseInt(binding.level.value),
						columnNames: binding.columnNames ? JSON.parse(binding.columnNames.value) : undefined,
					}
				}))
				// Do not trigger exception. Treat this as a missing dataset
				: Promise.resolve();
			}
		).then(objects => {
			return {
				objects,
				tf: objects === undefined ? undefined : tableFormatForSpecies(objects[0].objSpec, config)
			};
		})
		.then(({objects, tf}) => {
			if (tf === undefined) return;

			return tf.then(tableFormat => {
				objects.map(object => {
					object.tableFormat = object.columnNames ? tableFormat.withColumnNames(object.columnNames) : tableFormat
				});
				return objects;
			});

		});
};

export const fetchBinTable = request => {
	return getBinaryTable(request, '/cpb');
};
