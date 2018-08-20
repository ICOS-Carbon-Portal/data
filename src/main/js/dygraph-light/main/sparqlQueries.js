export function objectSpecification(config, objIds){
	const ids = objIds.map(id => `<${config.cpmetaObjectUri}${id}>`).join(' ');
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select * where {
	values ?obj { ${ids} }
	?obj cpmeta:hasObjectSpec ?objSpec ;
	cpmeta:hasNumberOfRows ?nRows ;
	cpmeta:hasName ?fileName .
}`;
}
