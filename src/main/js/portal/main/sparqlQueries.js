import config from './config';
import {sparqlEscape} from './models/Filters';

var {wdcggBaseUri, wdcggStationProp, wdcggLatProp, wdcggLonProp, cpmetaOntoUri, cpmetaResUri} = config;

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
	<${dobjId}> cpmeta:wasProducedBy [
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
	?dobj cpmeta:wasProducedBy ?prod . {
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
	?dobj cpmeta:wasProducedBy ?prod .
	?prod  prov:startedAtTime ?startTime .
	?prod  prov:endedAtTime ?endTime .
}`;
}

export function getPropValueCounts(spec, filters, fromDate, toDate, spatialStationList){
	const props = Object.keys(filters).filter(key => filters[key].render);
	const propsList = '<' + props.join('> <') + '>';

	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate);
	const spatialSupplement = stationNamesQueryComponent(spatialStationList);

	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT ?prop ?value (count(?dobj) as ?count)
FROM <${wdcggBaseUri}>
WHERE {
	{
		select ?dobj where {
			${spatialSupplement}
			${dobjsQueryStatements}
		}
	}
	VALUES ?prop {${propsList}}
	?dobj ?prop ?value .
}
group by ?prop ?value
order by ?prop ?value`;
}

function stationNamesQueryComponent(stationNames){
	const namesEnumeration = stationNames
		.map(station => '"' + sparqlEscape(station.name) + '"^^xsd:string')
		.join(" ");
	return stationNames.length > 0
		? `?dobj <${wdcggStationProp}> ?stationName .
			VALUES ?stationName {
				${namesEnumeration}
			}`
		: "";
}

function getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate){
	const props = Object.keys(filters).filter(key => filters[key].render);
	// const props = config.wdcggProps.map(({uri, label}) => );
	const propsList = '<' + props.join('> <') + '>';
	const filterClauses = props.map(prop => filters[prop].getSparql("dobj")).join('');

	console.log({spec, filters, keys: Object.keys(filters), props, fromDate, toDate});

	const fromDateClause = fromDate
		? `
			?dobj cpmeta:wasProducedBy/prov:endedAtTime ?endTime .
			FILTER(?endTime >= "${fromDate}"^^xsd:dateTime)`
		: "";

	const toDateClause = toDate
		? `
			?dobj cpmeta:wasProducedBy/prov:startedAtTime ?startTime .
			FILTER(?startTime <= "${toDate}"^^xsd:dateTime)`
		: "";

	return `?dobj cpmeta:hasObjectSpec <${spec}> .
	${filterClauses} ${fromDateClause} ${toDateClause}`;
}

export function getFilteredDataObjQuery(spec, filters, fromDate, toDate, spatialStationList){
	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate);
	const spatialSupplement = stationNamesQueryComponent(spatialStationList);

	return `prefix cpmeta: <${cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?fileName ?nRows
FROM <${wdcggBaseUri}>
where {
	${dobjsQueryStatements}
	${spatialSupplement}
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function stationPositions(){
	return `select distinct ?name (SAMPLE(?latStr) AS ?lat) (SAMPLE(?lonStr) AS ?lon)
from <${wdcggBaseUri}>
where{
	?dobj <${wdcggStationProp}> ?name .
	?dobj <${wdcggLatProp}> ?latStr .
	?dobj <${wdcggLonProp}> ?lonStr .
	filter(?latStr != "" && ?lonStr != "")
}
group by ?name
order by ?name`;
}

