import {sparql} from 'icos-cp-backend';
import config from 'config'

function runSparql(query){
	return sparql(query, config.sparqlEndpoint, true);
}

//Returns a Promise of a dictionary-object with labels
export function getObjSpecLabels(specUris){
	const query = `select * where {
		VALUES ?spec { <${specUris.join("> <")}> }
		?spec rdfs:label ?label
	}`;
	return runSparql(query).then(makeLabelsDict("spec", "label"));
}

export function getStationLabels(stationUris){
	const query = `
		prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		select ?station ?label where{
			values ?station { <${stationUris.join("> <")}> }
			?station cpmeta:hasStationId ?id ; cpmeta:hasName ?name .
			bind (concat("(", ?id, ") ", ?name) as ?label)
		}`
	return runSparql(query).then(makeLabelsDict("station", "label"));
}

function makeLabelsDict(resourceVar, labelVar){
	return function(sparqlResults){
		return sparqlResults.results.bindings.reduce(
			(acc, curr) => {
				acc[curr[resourceVar].value] = curr[labelVar].value;
				return acc;
			},
			{}
		);
	};
}
