import {type Query} from "icos-cp-backend";
import localConfig from "../config";
import commonConfig from "../../../common/main/config";
import {distinct} from "../utils";
import {envriFilteringFromClauses, objectFilterClauses} from "../sparqlQueries";
import {type QueryParameters} from "../actions/types";
import {sparqlFetchAndParse} from "./SparqlFetch";
import {sparqlParsers} from "./sparql";
import {type UrlStr} from "./declarations";

export type SpecLookupByKeyword = Record<string, UrlStr[] | undefined>;


export default {
	async fetch(query: QueryParameters): Promise<string[]> {
		return getUniqueKeywords(query);
	}
};
const config = Object.assign(commonConfig, localConfig);

// Proj keywords are inherited
export function specKeywordsQuery(): Query<"spec" | "keywords", never> {
	const text = `# spec keywords
prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
select ?spec ?keywords
from <${config.metaResourceGraph[config.envri]}>
where{
	?spec cpmeta:hasAssociatedProject ?proj
	{
		{?proj cpmeta:hasKeywords ?keywords }
		UNION
		{?spec cpmeta:hasKeywords ?keywords }
	}
	filter not exists {?proj cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
}`;
	return {text};
}

async function getUniqueKeywords(query: QueryParameters): Promise<string[]> {
	return sparqlFetchAndParse(
		filteredKeywordsQuery(query),
		commonConfig.sparqlEndpoint,
		b => ({
			keywords: sparqlParsers.fromCommaSepListString(b.keywords)
		})
	).then(res => distinct(res.rows.flatMap(r => r.keywords)));
}

function filteredKeywordsQuery(params: QueryParameters): Query<"keywords", never> {
	const prefixes = `
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
prefix geo: <http://www.opengis.net/ont/geosparql#>`;

	return {
		text: `# filteredKeywordsQuery
${prefixes}
select (cpmeta:distinct_keywords() as ?keywords)
${envriFilteringFromClauses}
where {
	${objectFilterClauses(params)}
}`
	};
}
