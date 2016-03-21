export function queryTableSchema(id){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
SELECT distinct ?colName ?valueType ?valFormat ?unit ?qKind ?nrows ?colTip
WHERE {
	bind (<https://meta.icos-cp.eu/objects/${id}> as ?dobj)
	?dobj cpmeta:hasObjectSpec ?spec .
	?dobj cpmeta:hasNumberOfRows ?nrows .
	?spec cpmeta:containsDataset ?dset .
	?dset cpmeta:hasColumn ?column  .
	?column cpmeta:hasColumnTitle ?colName .
	?column cpmeta:hasValueFormat ?valFormat .
	?column cpmeta:hasValueType ?valType .
	?valType rdfs:label ?valueType .
	optional{?valType rdfs:comment ?colTip }
	optional{
		?valType cpmeta:hasUnit ?unit .
		?valType cpmeta:hasQuantityKind [rdfs:label ?qKind ].
	}
}`;
}

export function queryDatasetGlobalMeta(id){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
SELECT ?producerName ?submitterName ?fileName (str(?nr) as ?nrows)
WHERE {
	bind (<https://meta.icos-cp.eu/objects/${id}> as ?dobj)
	?dobj cpmeta:wasProducedBy ?producer .
	?producer prov:wasAssociatedWith ?prodAssociate .
	?prodAssociate cpmeta:hasName ?producerName .
	?dobj cpmeta:wasSubmittedBy ?submitter .
	?submitter prov:wasAssociatedWith ?submitAssociate .
	?submitAssociate cpmeta:hasName ?submitterName .
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:hasNumberOfRows ?nr .
}`;
}

export function queryDatasetGlobalParams(id){
	return `prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
SELECT ?label ?val
WHERE {
	bind (<https://meta.icos-cp.eu/objects/${id}> as ?dobj)
	?p rdfs:subPropertyOf cpmeta:hasFormatSpecificMetadata .
	?p rdfs:label ?label .
	?dobj ?p ?val .
}`;
}