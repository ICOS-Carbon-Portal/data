
export function specs(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select distinct ?spec ?specLabel ?level ?format ?colTitle ?valType ?qKind ?unit
from <http://meta.icos-cp.eu/resources/cpmeta/>
from <http://meta.icos-cp.eu/ontologies/cpmeta/>
where{
   ?spec cpmeta:hasDataLevel ?level .
  ?spec rdfs:label ?specLabel .
  ?spec cpmeta:hasFormat [rdfs:label ?format ]
  OPTIONAL{
    ?spec cpmeta:containsDataset ?dataSet .
    ?dataSet cpmeta:hasColumn ?column .
    ?column cpmeta:hasColumnTitle ?colTitle .
    ?column cpmeta:hasValueType ?valTypeRes .
    ?valTypeRes rdfs:label ?valType .
    OPTIONAL{?valTypeRes cpmeta:hasQuantityKind [rdfs:label ?qKind] }
    OPTIONAL{?valTypeRes cpmeta:hasUnit ?unit }
  }
}`;
}

export function specCount(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?spec ?submitter (count(?dobj) as ?count) where{
  ?dobj cpmeta:hasObjectSpec ?spec .
  ?dobj cpmeta:wasSubmittedBy [<http://www.w3.org/ns/prov#wasAssociatedWith> ?submitter]
}
group by ?spec ?submitter
order by ?spec`;
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