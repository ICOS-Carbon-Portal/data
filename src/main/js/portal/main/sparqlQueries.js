
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

export function simpleDataObject(objSpec, dobjId){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select *
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
where {
	<${dobjId}> cpmeta:hasObjectSpec <${objSpec}> .
	<${dobjId}> cpmeta:hasName ?fileName .
	<${dobjId}> cpmeta:hasNumberOfRows ?nRows .
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
prefix prov: <http://www.w3.org/ns/prov#>
SELECT distinct ?label (str(?value) as ?val)
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
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
from <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
where{
	?dobj cpmeta:hasObjectSpec <${spec}> .
	?dobj cpmeta:wasProducedBy ?prod .
	?prod  prov:startedAtTime ?startTime .
	?prod  prov:endedAtTime ?endTime .
}`;
}

export function getPropValueCounts(spec, filters, fromDate, toDate){
	const props = Object.keys(filters);
	const propsList = '<' + props.join('> <') + '>';

	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate);

	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT ?prop ?value (count(?dobj) as ?count)
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
WHERE {
	{
		select ?dobj where {
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

export function getFilteredDataObjQuery(spec, filters, fromDate, toDate){
	const dobjsQueryStatements = getFilteredDataObjQueryStatements(spec, filters, fromDate, toDate);
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?fileName ?nRows
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
where {
	${dobjsQueryStatements}
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:hasNumberOfRows ?nRows .
} order by ?fileName`;

}