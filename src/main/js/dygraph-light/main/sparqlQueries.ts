import {Query} from 'icos-cp-backend'

type SpecQuery = Query<"dobj" | "objSpec" | "nRows" | "fileName" | "specLabel", "columnNames">

export type Config = {
	cpmetaObjectUri: string
	cpmetaOntoUri: string
	sparqlEndpoint: string
}

export function objectSpecification(config: Config, objIds: string[]): SpecQuery{
	const ids = objIds.map(id => `<${config.cpmetaObjectUri}${id}>`).join(' ');
	const text = `prefix cpmeta: <${config.cpmetaOntoUri}>
select * where {
	values ?dobj { ${ids} }
	?dobj cpmeta:hasObjectSpec ?objSpec ;
	cpmeta:hasNumberOfRows ?nRows ;
	cpmeta:hasName ?fileName .
	?objSpec rdfs:label ?specLabel .
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
}`;
	return {text};
}
