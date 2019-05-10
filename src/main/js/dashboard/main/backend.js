import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import config from '../../common/main/config';
import 'whatwg-fetch';

export const fetchStationMeasurement = (stationId, valueType) => {
	const query = queries.listStationMeasurement(config, stationId, valueType);

	return sparql(query, config.sparqlEndpoint)
		.then(sparqlResult => {
			const bindings = sparqlResult.results.bindings;
			return bindings
				? Promise.resolve(bindings.map(binding => {
					return {
						dobj: binding.dobj.value,
						spec: binding.spec.value,
						valType: binding.valType.value,
						height: parseFloat(binding.height.value),
						instrument: binding.instrument.value
					}
				}))
				: Promise.reject(new Error(`Could not get station measurements for stationId = ${stationId}, valueType = ${valueType}`));
		});
};
