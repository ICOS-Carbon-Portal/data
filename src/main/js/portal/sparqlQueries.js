
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
SELECT ?property ?value
FROM <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
WHERE {
	<${dobjId}> ?p ?value .
	?p rdfs:subPropertyOf cpmeta:hasFormatSpecificMetadata .
	?p rdfs:label ?label .
}`;
}

