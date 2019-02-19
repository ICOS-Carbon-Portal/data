export function objectSpecification(config, objIds){
	const ids = objIds.map(id => `<${config.cpmetaObjectUri}${id}>`).join(' ');
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select * where {
	values ?dobj { ${ids} }
	?dobj cpmeta:hasObjectSpec ?objSpec ;
	cpmeta:hasNumberOfRows ?nRows ;
	cpmeta:hasName ?fileName .
	?objSpec rdfs:label ?specLabel .
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
}`;
}
