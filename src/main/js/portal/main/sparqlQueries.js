import config from './config';
import {sparqlEscape} from './models/Filters';

var {wdcggBaseUri, cpmetaOntoUri, cpmetaResUri} = config;

export function simpleDataObjects(objSpec){
	return `prefix cpmeta: <${cpmetaOntoUri}>
select *
FROM <${wdcggBaseUri}>
where {
	?id cpmeta:hasObjectSpec <${objSpec}> .
	?id cpmeta:hasName ?fileName .
	?id cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function simpleDataObject(objSpec, dobjId){
	return `prefix cpmeta: <${cpmetaOntoUri}>
select *
FROM <${wdcggBaseUri}>
where {
	<${dobjId}> cpmeta:hasObjectSpec <${objSpec}> .
	<${dobjId}> cpmeta:hasName ?fileName .
	<${dobjId}> cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function simpleObjectSchema(spec){
	return `prefix cpmeta: <${cpmetaOntoUri}>
SELECT distinct ?colName ?valueType ?valFormat ?unit ?qKind ?colTip
FROM <${cpmetaResUri}>
WHERE {
	<${spec}> cpmeta:containsDataset ?dset .
	?dset cpmeta:hasColumn [
		cpmeta:hasColumnTitle ?colName ;
		cpmeta:hasValueFormat ?valFormat ;
		cpmeta:hasValueType ?valType
	] .
	?valType rdfs:label ?valueType .
	optional{?valType rdfs:comment ?colTip }
	optional{
		?valType cpmeta:hasUnit ?unit .
		?valType cpmeta:hasQuantityKind [rdfs:label ?qKind ] .
	}
} order by ?colName`;
}

export function standardDataObjProps(dobjId){
	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT *
FROM <${wdcggBaseUri}>
WHERE {
	<${dobjId}> cpmeta:wasSubmittedBy/prov:wasAssociatedWith/cpmeta:hasName ?submitterName .
	<${dobjId}> cpmeta:wasAcquiredBy [
		prov:startedAtTime ?prodStart ;
		prov:endedAtTime ?prodEnd ;
		prov:wasAssociatedWith/cpmeta:hasName ?producerName
	] .
}`;
}

export function formatSpecificProps(dobjId){
	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT distinct ?prop ?label (str(?value) as ?val)
FROM <${wdcggBaseUri}>
WHERE {
	BIND (<${dobjId}> AS ?dobj)
	?dobj cpmeta:wasAcquiredBy ?prod . {
		{
			?prod prov:startedAtTime ?value .
			BIND ("SAMPLING START" AS ?label)
		} UNION {
			?prod prov:endedAtTime ?value .
			BIND ("SAMPLING STOP" AS ?label)
		} UNION {
			?prop rdfs:subPropertyOf cpmeta:hasFormatSpecificMetadata .
			?dobj ?prop ?value .
			?prop rdfs:label ?label .
		}
	}
}
ORDER BY ?label`;
}

export function getGlobalTimeInterval(spec){
	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select  (min(?startTime) as ?startMin) (max(?endTime) as ?endMax)
FROM <${wdcggBaseUri}>
where{
	?dobj cpmeta:hasObjectSpec <${spec}> .
	?dobj cpmeta:wasAcquiredBy ?prod .
	?prod  prov:startedAtTime ?startTime .
	?prod  prov:endedAtTime ?endTime .
}`;
}

export function getPropValueCounts(spec, filters){
	const wdcggProps = config.wdcggProps.map(({uri}) => uri);
	const wdcggPropsList = '<' + wdcggProps.join('> <') + '>';

	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters);

	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT ?prop ?value (count(?dobj) as ?count)
FROM <${wdcggBaseUri}>
WHERE {
	{
		select ?dobj where {
			${dobjsQueryStatements}
		}
	}
	{
		{
			VALUES ?prop {${wdcggPropsList}}
			?dobj ?prop ?value .
		} UNION
		{
			?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .
			{
				{
					BIND (<${config.stationNameProp}> AS ?prop) .
					?station ?prop ?value .
				} UNION
				{
					BIND (<${config.stationCountryProp}> AS ?prop) .
					?station ?prop ?value .
				} UNION
				{
					BIND (<${config.stationProp}> AS ?prop) .
					?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?value .
				}
			}
		}
	}
}
group by ?prop ?value
order by ?prop ?value`;
}

function getFilteredDataObjQueryStatements(spec, filters){
	const stationKeys = [config.stationProp, config.stationNameProp, config.stationCountryProp];

	const stationFilters = stationKeys.map(key => filters[key])
		.filter(filter => filter && !filter.isEmpty());

	const stationClauses = stationFilters.map(filter => filter.getSparql("station")).join('\n');

	const stationFilteringComponent = stationFilters.length > 0
		? "?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .\n" + stationClauses
		: "";
	const filterClauses = Object.getOwnPropertyNames(filters)
		.filter(prop => !stationKeys.includes(prop))
		.map(prop => filters[prop].getSparql("dobj")).join('');

	return `?dobj cpmeta:hasObjectSpec <${spec}> .
		${stationFilteringComponent}
		${filterClauses}`;
}

export function getFilteredDataObjQuery(spec, filters){
	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters);

	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?fileName ?nRows
FROM <${wdcggBaseUri}>
where {
	${dobjsQueryStatements}
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function stationInfo(){
	return `prefix cpmeta: <${cpmetaOntoUri}>
select *
from <${wdcggBaseUri}>
where{
	?station a cpmeta:Station .
	?station cpmeta:hasName ?name .
	?station cpmeta:country ?country .
	OPTIONAL { ?station cpmeta:hasLatitude ?lat }
	OPTIONAL { ?station cpmeta:hasLongitude ?lon }
}`;
}
