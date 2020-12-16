import {sparql} from 'icos-cp-backend';
import config from './config';
import commonConfig from '../../common/main/config';

export function getObjSpecInfo(specUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select * where {
		VALUES ?spec { <${specUris.join("> <")}> }
		?spec rdfs:label ?label .
		?spec cpmeta:hasDataLevel ?level
	}`;
	return sparqlParser(query, "spec", ["label", "level"]);
}

export function getStationLabels(stationUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select ?station ?label where{
			values ?station { <${stationUris.join("> <")}> }
			?station cpmeta:hasStationId ?id ; cpmeta:hasName ?name .
			bind (concat("(", ?id, ") ", ?name) as ?label)
		}`;
	return sparqlLabels(query, "station", "label");
}

export function getFileNames(dobjUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select * where{
			values ?dobj { <${dobjUris.join("> <")}> }
			?dobj cpmeta:hasName ?fname .
		}`;
	return sparqlLabels(query, "dobj", "fname");
}

export function getContributorNames(contribUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
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

	return sparql({text: query}, config.sparqlEndpoint, false).then(sparqlResults =>
		sparqlResults.results.bindings.reduce(
			(acc, curr) => {
				acc[curr[resourceVar].value] = curr[labelVar].value;
				return acc;
			},
			{}
		)
	);
}

function sparqlParser(query, key, valueKeys){

	return sparql({text: query}, config.sparqlEndpoint, false).then(sparqlResults =>
		sparqlResults.results.bindings.reduce(
			(acc, curr) => {
				acc[curr[key].value] = valueKeys.reduce((acc2, currKey) => {
					acc2[currKey] = curr[currKey].value;
					return acc2;
				}, {});
				return acc;
			},
			{}
		)
	);
}
