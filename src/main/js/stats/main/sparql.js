import {sparql} from 'icos-cp-backend';
import config from './config';
import commonConfig from '../../common/main/config';

export function getObjSpecLabels(specUris){
	const query = `select * where {
		VALUES ?spec { <${specUris.join("> <")}> }
		?spec rdfs:label ?label
	}`;
	return sparqlLabels(query, "spec", "label");
}

export function getStationLabels(stationUris){
	const query = `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		select ?station ?label where{
			values ?station { <${stationUris.join("> <")}> }
			?station cpmeta:hasStationId ?id ; cpmeta:hasName ?name .
			bind (concat("(", ?id, ") ", ?name) as ?label)
		}`;
	return sparqlLabels(query, "station", "label");
}

export function getFileNames(dobjUris){
	const query = `select * where{
			values ?dobj { <${dobjUris.join("> <")}> }
			?dobj <http://meta.icos-cp.eu/ontologies/cpmeta/hasName> ?fname .
		}`;
	return sparqlLabels(query, "dobj", "fname");
}

export function getContributorNames(contribUris){
	const query = `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		select ?contrib ?name where{
			${contribUris.length
				? `values ?contrib { <${contribUris.join("> <")}> }` 
				: ''
			}
			{
			  ?contrib cpmeta:hasFirstName ?firstName .
			  ?contrib cpmeta:hasLastName ?lastName .
			  BIND(CONCAT(?firstName, " ", ?lastName) AS ?name)
		   } UNION {
			  ?contrib cpmeta:hasName ?name
		   }
		}`;
	return sparqlLabels(query, "contrib", "name");
}

export function getStationCountryCodes(){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select ?station ?countryCode where{
			?station cpmeta:countryCode ?countryCode .
		}`;
	return sparqlLabels(query, "station", "countryCode");
}

//Returns a Promise of a dictionary-object with labels
function sparqlLabels(query, resourceVar, labelVar){
	return sparql(query, config.sparqlEndpoint, false).then(sparqlResults =>
		sparqlResults.results.bindings.reduce(
			(acc, curr) => {
				acc[curr[resourceVar].value] = curr[labelVar].value;
				return acc;
			},
			{}
		)
	);
}
