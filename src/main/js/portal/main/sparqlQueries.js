
export function specs(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?spec ?specLabel ?level ?format
where{
	?spec cpmeta:hasDataLevel ?level .
	?spec rdfs:label ?specLabel .
	?spec cpmeta:hasFormat [rdfs:label ?format ]
}`;
}

export function columnMeta(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select distinct ?spec ?colTitle ?valType ?qKind ?unit
where{
	?spec cpmeta:containsDataset [cpmeta:hasColumn ?column ] .
	?column cpmeta:hasColumnTitle ?colTitle .
	?column cpmeta:hasValueType ?valTypeRes .
	?valTypeRes rdfs:label ?valType .
	OPTIONAL{?valTypeRes cpmeta:hasQuantityKind [rdfs:label ?qKind] }
	OPTIONAL{?valTypeRes cpmeta:hasUnit ?unit }
}`;
}

export function dobjCounts(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select
?spec
(sample(?submitterName) as ?submitter)
(sample(?stationName) as ?station)
(count(?dobj) as ?count)
(if(sample(?submitterClass) = cpmeta:ThematicCenter, "ICOS", "Non-ICOS") as ?isIcos)
where{
	?dobj cpmeta:wasSubmittedBy [prov:wasAssociatedWith ?submitterRes ] .
	OPTIONAL{
		?dobj cpmeta:wasAcquiredBy [prov:wasAssociatedWith ?stationRes ] .
		?stationRes cpmeta:hasName ?stationName .
	}
	?dobj cpmeta:hasObjectSpec ?spec .
	?submitterRes cpmeta:hasName ?submitterName .
	?submitterRes a ?submitterClass .
	FILTER(?submitterClass != owl:NamedIndividual)
}
group by ?spec ?submitterRes ?stationRes`;
}

export function findDobjs(config, search){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
SELECT ?dobj WHERE{
  ?dobj  cpmeta:hasObjectSpec ?spec.
  FILTER CONTAINS(LCASE(REPLACE(STR(?dobj), "${config.cpmetaObjectUri}", "")), LCASE("${search}"))
}`;
}

export function findStations(config, search){
	return `PREFIX cpst: <http://meta.icos-cp.eu/ontologies/stationentry/>
SELECT DISTINCT (str(?lName) AS ?Long_name)
FROM <http://meta.icos-cp.eu/resources/stationentry/>
WHERE {
  ?s cpst:hasLongName ?lName .
  FILTER CONTAINS(LCASE(STR(?lName)), LCASE("${search}"))
}
ORDER BY ?Long_name`;
}

export function rdfGraphsAndSpecFormats(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?graph (sample(?fmt) as ?format) where{
	?spec cpmeta:hasFormat [rdfs:label ?fmt] .
	graph ?graph {
	?dobj cpmeta:hasObjectSpec ?spec .
	}
}
group by ?graph`;
}

