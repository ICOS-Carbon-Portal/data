export const listStationMeasurement = (config, stationId) => {
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>

select ?station ?dobj ?dataEnd ?columnName ?samplingHeight ?level where{
	?station cpmeta:hasStationId "${stationId}"^^xsd:string .
	VALUES ?columnName { "co2" "ch4" "n2o" "co" }
	?column cpmeta:hasColumnTitle ?columnName ;
		cpmeta:hasValueType/cpmeta:hasUnit ?unit .
	?spec cpmeta:containsDataset/cpmeta:hasColumn ?column ;
		cpmeta:hasDataLevel ?level ;
		cpmeta:hasFormat <http://meta.icos-cp.eu/ontologies/cpmeta/asciiAtcProductTimeSer> ;
		cpmeta:hasAssociatedProject <http://meta.icos-cp.eu/resources/projects/icos> .
	VALUES ?level {"1"^^xsd:integer "2"^^xsd:integer}
	?dobj cpmeta:hasObjectSpec ?spec .
	?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .
	?dobj cpmeta:wasAcquiredBy/prov:endedAtTime ?dataEnd .
	?dobj cpmeta:wasAcquiredBy/cpmeta:hasSamplingHeight ?samplingHeight .
	?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .
	filter not exists {[] cpmeta:isNextVersionOf ?dobj}
}
order by desc(?dataEnd)`;
};

export const objectSpecifications = (config, objIds) => {
	const ids = objIds.map(id => `<${id}>`).join(' ');
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
	select * where {
	values ?dobj { ${ids} }
	?dobj cpmeta:hasObjectSpec ?objSpec ;
	cpmeta:hasNumberOfRows ?nRows ;
	cpmeta:hasName ?fileName .
	?objSpec rdfs:label ?specLabel ;
	cpmeta:hasDataLevel ?level .
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
	}`;
};
