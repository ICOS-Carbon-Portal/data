import {sparql} from 'icos-cp-backend';
import {findDobjs, findStations} from './sparqlQueries';

export const searchDobjs = (config, search) => {
	const query = findDobjs(config, search);

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

export const searchStations = (config, search) => {
	const query = findStations(config, search);

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
