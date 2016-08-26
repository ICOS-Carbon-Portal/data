import config from './config';

var {wdcggBaseUri, cpmetaOntoUri, cpmetaResUri} = config;

export function simpleObjectSchema(spec){
	return `prefix cpmeta: <${cpmetaOntoUri}>
SELECT distinct ?colName ?valueType ?valFormat ?unit ?qKind ?colTip
FROM <${cpmetaResUri}>
WHERE {
	<${spec}> cpmeta:containsDataset ?dset .
	?dset cpmeta:hasColumn [
		cpmeta:hasColumnTitle ?colName ;
		cpmeta:hasValueFormat ?valFormat ;
		cpmeta:hasValueType ?valType
	] .
	?valType rdfs:label ?valueType .
	optional{?valType rdfs:comment ?colTip }
	optional{
		?valType cpmeta:hasUnit ?unit .
		?valType cpmeta:hasQuantityKind [rdfs:label ?qKind ] .
	}
} order by ?colName`;
}


export function stationPositions(){
	return `prefix cpmeta: <${cpmetaOntoUri}>
select *
from <${wdcggBaseUri}>
where{
	?station a cpmeta:Station .
	?station cpmeta:hasName ?name .
	OPTIONAL { ?station cpmeta:hasLatitude ?lat }
	OPTIONAL { ?station cpmeta:hasLongitude ?lon }
}`;
}

