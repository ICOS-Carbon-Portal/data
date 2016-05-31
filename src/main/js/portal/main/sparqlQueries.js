const wdcggUri = "http://meta.icos-cp.eu/resources/wdcgg/";

export function simpleDataObjects(objSpec){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select *
FROM <${wdcggUri}>
where {
	?id cpmeta:hasObjectSpec <${objSpec}> .
	?id cpmeta:hasName ?fileName .
	?id cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function simpleDataObject(objSpec, dobjId){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select *
FROM <${wdcggUri}>
where {
	<${dobjId}> cpmeta:hasObjectSpec <${objSpec}> .
	<${dobjId}> cpmeta:hasName ?fileName .
	<${dobjId}> cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function simpleObjectSchema(spec){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
SELECT distinct ?colName ?valueType ?valFormat ?unit ?qKind ?colTip
FROM <http://meta.icos-cp.eu/resources/cpmeta/>
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
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT *
FROM <${wdcggUri}>
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
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT distinct ?label (str(?value) as ?val)
FROM <${wdcggUri}>
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
			?p rdfs:subPropertyOf cpmeta:hasFormatSpecificMetadata .
			?dobj ?p ?value .
			?p rdfs:label ?label .
		}
	}
}
ORDER BY ?label`;
}

export function getGlobalTimeInterval(spec){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select  (min(?startTime) as ?startMin) (max(?endTime) as ?endMax)
FROM <${wdcggUri}>
where{
	?dobj cpmeta:hasObjectSpec <${spec}> .
	?dobj cpmeta:wasProducedBy ?prod .
	?prod  prov:startedAtTime ?startTime .
	?prod  prov:endedAtTime ?endTime .
}`;
}

export function getPropValueCounts(spec, filters, fromDate, toDate, spatialStationList){
	const props = Object.keys(filters);
	const propsList = '<' + props.join('> <') + '>';

	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate);
	const spatialSupplement = spatialStationList.length > 0
		? `?dobj <http://meta.icos-cp.eu/ontologies/cpmeta/wdcgg/STATION+NAME> ?stationName .\n
			VALUES ?stationName {\n
			${spatialStationList.map(station => 
				'"' + station.name.replace(/"/g, '\\"') + '"^^xsd:string')
			.join(" ")}\n}\n`
		: "";

	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT ?prop ?value (count(?dobj) as ?count)
FROM <${wdcggUri}>
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

function getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate){
	const props = Object.keys(filters);
	const propsList = '<' + props.join('> <') + '>';
	const filterClauses = props.map(prop => filters[prop].getSparql("dobj")).join('');

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
	const spatialSupplement = spatialStationList.length > 0
		? `?dobj <http://meta.icos-cp.eu/ontologies/cpmeta/wdcgg/STATION+NAME> ?stationName .\n
			VALUES ?stationName {\n
			${spatialStationList.map(station =>
	'"' + station.name.replace(/"/g, '\\"') + '"^^xsd:string')
		.join(" ")}\n}\n`
		: "";

	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?fileName ?nRows
FROM <${wdcggUri}>
where {
	${dobjsQueryStatements}
	${spatialSupplement}
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function stationPositions(){
	return `prefix wdcgg: <http://meta.icos-cp.eu/ontologies/cpmeta/wdcgg/>
select distinct ?name (SAMPLE(?latStr) AS ?lat) (SAMPLE(?lonStr) AS ?lon)
from <http://meta.icos-cp.eu/resources/wdcgg/>
where{
	?dobj <http://meta.icos-cp.eu/ontologies/cpmeta/wdcgg/STATION+NAME> ?name .
	?dobj wdcgg:LATITUDE ?latStr .
	?dobj wdcgg:LONGITUDE ?lonStr .
	filter(?latStr != "" && ?lonStr != "")
}
group by ?name
order by ?name`;
}
