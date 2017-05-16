import {sparql} from 'icos-cp-backend';
import {specs, specCount, findDobjs, findStations} from './sparqlQueries';

export const fetchSpecs = config => {
	const query = specs(config);

	return sparql(query, config.sparqlEndpoint)
		.then(
			specs => {
				const vars = specs.head.vars;
				const bindings = specs.results.bindings;

				return bindings
					? Promise.resolve({
						vars: vars.filter(v => v !== "spec"),
						specData: getValueObjects(bindings)
					})
					: Promise.reject(new Error("Could not get specs from meta"));
			}
		);
};

export const fetchSpecCount = config => {
	const query = specCount(config);

	return sparql(query, config.sparqlEndpoint)
		.then(
			specCount => {
				const bindings = specCount.results.bindings;

				return bindings
					? Promise.resolve(getValueObjects(bindings))
					: Promise.reject(new Error("Could not get spec count from meta"));
			}
		);
};

const getValueObjects = bindings => {
	return bindings.map(b => {
		return Object.keys(b).reduce((acc, curr) => {
			acc[curr] = b[curr].datatype === "http://www.w3.org/2001/XMLSchema#integer"
				? parseInt(b[curr].value)
				: b[curr].value;
			return acc;
		}, {});
	});
};

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
