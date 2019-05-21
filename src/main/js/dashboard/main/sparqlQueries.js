export const listStationMeasurement = (config, stationId, valueType, height) => {
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>

select ?station ?dobj ?unit ?dataEnd where{
	?station cpmeta:hasStationId "${stationId}"^^xsd:string .
	?column cpmeta:hasColumnTitle "${valueType}"^^xsd:string ;
		cpmeta:hasValueType/cpmeta:hasUnit ?unit .
	?spec cpmeta:containsDataset/cpmeta:hasColumn ?column ;
		cpmeta:hasDataLevel "1"^^xsd:integer ;
		cpmeta:hasAssociatedProject <http://meta.icos-cp.eu/resources/projects/copernicus> .
	?dobj cpmeta:hasObjectSpec ?spec .
	?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .
	?dobj cpmeta:wasAcquiredBy/prov:endedAtTime ?dataEnd .
	?dobj cpmeta:wasAcquiredBy/cpmeta:hasSamplingHeight ?samplingHeight .
	filter (?samplingHeight = ${height}) .
}
order by desc(?dataEnd)
limit 1`;
};

export const objectSpecifications = (config, objIds) => {
	const ids = objIds.map(id => `<${id}>`).join(' ');
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
	select * where {
	values ?dobj { ${ids} }
	?dobj cpmeta:hasObjectSpec ?objSpec ;
	cpmeta:hasNumberOfRows ?nRows ;
	cpmeta:hasName ?fileName .
	?objSpec rdfs:label ?specLabel .
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
	}`;
};
