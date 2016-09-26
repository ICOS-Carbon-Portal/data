import config from '../config';
import {sparql} from './sparql';
import {parseTableFormat} from '../dataformats/TableFormat';

export function tableFormatForSpecies(objSpeciesUri){
	const query = simpleObjectSchemaQuery(objSpeciesUri);
	return sparql(query).then(parseTableFormat);
}

function simpleObjectSchemaQuery(speciesUri){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
SELECT distinct ?objFormat ?colName ?valueType ?valFormat ?unit ?qKind ?colTip
FROM <${config.cpmetaResUri}>
WHERE {
	<${speciesUri}> cpmeta:containsDataset ?dset .
	<${speciesUri}> cpmeta:hasFormat ?objFormat .
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
