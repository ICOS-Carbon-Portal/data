export function objectSpecification(config, objId){
	return `prefix cpmeta: <${config.cpmetaOntoUri}> 
select * where{
	bind (<${config.cpmetaObjectUri}${objId}> as ?dobj)
	?dobj cpmeta:hasObjectSpec ?objSpec ;
		cpmeta:hasNumberOfRows ?nRows .
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?colNames}
}`;
}
