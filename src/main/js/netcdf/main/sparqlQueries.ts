import { Query } from "icos-cp-backend";

export function objectSpecification(config: any, objId: string): Query<"objSpec" | "specLabel", never>{
	const text = `prefix cpmeta: <${config.cpmetaOntoUri}>
select * where{
	<${config.cpmetaObjectUri}${objId}> cpmeta:hasObjectSpec ?objSpec .
	?objSpec rdfs:label ?specLabel ;
}`;
	return { text };
}
