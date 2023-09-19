import {sparql} from 'icos-cp-backend';
import config from './config';
import commonConfig from '../../common/main/config';

export function getObjSpecInfo(specUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select * where {
		VALUES ?spec { <${specUris.filter(uri => uri != "").join("> <")}> }
		?spec rdfs:label ?label .
		?spec cpmeta:hasDataLevel ?level ; cpmeta:hasAssociatedProject ?project .
	}`;
	return sparqlParser(query, "spec", ["label", "level", "project"]);
}

export function getStationLabels(stationUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select ?station ?label where{
			values ?station { <${stationUris.filter(uri => uri != "").join("> <")}> }
			?station cpmeta:hasStationId ?id ; cpmeta:hasName ?name .
			bind (concat("(", ?id, ") ", ?name) as ?label)
		}`;
	return sparqlLabels(query, "station", "label");
}

export function getFileNames(dobjUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select * where{
			values ?dobj { <${dobjUris.filter(uri => uri != "").join("> <")}> }
			?dobj cpmeta:hasName ?fname .
		}`;
	return sparqlLabels(query, "dobj", "fname");
}

export function getContributorNames(contribUris){
	const query = `prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
		select ?contrib ?name where{
			values ?contrib { <${contribUris.filter(uri => uri != "").join("> <")}> }
			optional{
				?contrib cpmeta:hasFirstName ?firstName .
				?contrib cpmeta:hasLastName ?lastName .
			}
			optional{?contrib cpmeta:hasName ?orgName}
			BIND(if(bound(?orgName), ?orgName, CONCAT(?firstName, " ", ?lastName)) AS ?name)
			filter(bound(?name))
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

export function projectLabelLookup(){
	const query = `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>

		select ?uri ?label
		from <http://meta.icos-cp.eu/ontologies/cpmeta/>
		from <http://meta.icos-cp.eu/resources/cpmeta/>
		where {
			?uri a ?class .
			optional {?uri rdfs:label ?rdfsLabel }
			optional {?uri cpmeta:hasName ?name}
			bind(coalesce(?name, ?rdfsLabel) as ?label)
			filter( ?class = cpmeta:Project )
		}`;
	return sparqlLabels(query, "uri", "label")
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
