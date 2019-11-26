import {Query} from 'icos-cp-backend';

export type Config = {
	cpmetaOntoUri: string
	cpmetaObjectUri: string
	sparqlEndpoint: string
}

export function objectSpecification(config: Config, objId: string): Query<"dobj" | "objSpec" | "nRows", "colNames">{
	const text = `prefix cpmeta: <${config.cpmetaOntoUri}>
select * where{
	bind (<${config.cpmetaObjectUri}${objId}> as ?dobj)
	?dobj cpmeta:hasObjectSpec ?objSpec ;
		cpmeta:hasNumberOfRows ?nRows .
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?colNames}
}`;

	return {text};
}
