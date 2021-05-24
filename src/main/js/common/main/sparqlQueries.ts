import {Query} from 'icos-cp-backend'

type SpecQuery = Query<"dobj" | "objSpec" | "nRows" | "fileName" | "specLabel" | "startedAtTime", "columnNames">

export type ObjectSpecConfig = {
	cpmetaObjectUri: string
	cpmetaOntoUri: string
	sparqlEndpoint: string
}

export function objectSpecification(config: ObjectSpecConfig, objIds: string[]): SpecQuery{
	const ids = objIds.map(id => `<${config.cpmetaObjectUri}${id}>`).join(' ');
	const text = `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select distinct ?dobj ?objSpec ?nRows ?fileName ?specLabel ?startedAtTime ?columnNames where {
	values ?dobj { ${ids} }
	?dobj cpmeta:hasObjectSpec ?objSpec ;
	cpmeta:hasNumberOfRows ?nRows ;
	cpmeta:hasName ?fileName .
	?objSpec rdfs:label ?specLabel .
	?dobj cpmeta:wasAcquiredBy ?acquisition .
	?acquisition prov:startedAtTime ?startedAtTime
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
}`;
	return {text};
}
