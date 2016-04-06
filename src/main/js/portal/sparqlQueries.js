
export function simpleDataObjects(objSpec){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select *
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
where {
	?id cpmeta:hasObjectSpec <${objSpec}> .
	?id cpmeta:hasName ?fileName .
	?id cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;
}

export function simpleObjectSchema(spec){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
SELECT distinct ?colName ?valueType ?valFormat ?unit ?qKind ?colTip
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/instances/>
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
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
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
SELECT ?label ?value
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
WHERE {
	<${dobjId}> ?p ?value .
	?p rdfs:subPropertyOf cpmeta:hasFormatSpecificMetadata .
	?p rdfs:label ?label .
}`;
}

export function getCountriesForTimeInterval(spec, minDate, maxDate){
return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select distinct ?country
from <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
where{
	{
		select ?dobj where {
			?dobj cpmeta:hasObjectSpec <${spec}> .
			?dobj cpmeta:wasProducedBy ?prod .
			?prod  prov:startedAtTime ?startTime .
			FILTER(?startTime <= "${maxDate}"^^xsd:dateTime)
			?prod  prov:endedAtTime ?endTime .
			FILTER(?endTime >= "${minDate}"^^xsd:dateTime)
		}
	}
	?dobj <http://meta.icos-cp.eu/ontologies/cpmeta/wdcgg/COUNTRY%2FTERRITORY> ?country .
}
order by ?country`;
}

export function getGlobalTimeInterval(spec){
return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select  (min(?startTime) as ?startMin) (max(?endTime) as ?endMax)
from <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
where{
	?dobj cpmeta:hasObjectSpec <${spec}> .
	?dobj cpmeta:wasProducedBy ?prod .
	?prod  prov:startedAtTime ?startTime .
	?prod  prov:endedAtTime ?endTime .
}`;
}


/*
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT distinct ?label ?value
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
WHERE {
	{
		select ?dobj where {
			?dobj cpmeta:hasObjectSpec <http://meta.icos-cp.eu/ontologies/cpmeta/instances/wdcggDataObject> .
			?dobj cpmeta:wasProducedBy ?prod .
			?prod  prov:startedAtTime ?startTime .
			FILTER(?startTime <= "2013"^^xsd:dateTime)
			?prod  prov:endedAtTime ?endTime .
			FILTER(?endTime >= "2010"^^xsd:dateTime)
		}
	}
	?p rdfs:subPropertyOf cpmeta:hasFormatSpecificMetadata .
	?dobj ?p ?value .
	?p rdfs:label ?label .
}
order by ?label ?value
*/
