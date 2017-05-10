
export function findDobjs(config, search){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
SELECT ?dobj WHERE{
  ?dobj cpmeta:hasObjectSpec [rdfs:label ?spec ; cpmeta:hasDataLevel ?dataLevel].
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