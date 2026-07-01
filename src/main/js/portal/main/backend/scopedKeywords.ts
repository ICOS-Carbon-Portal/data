import { Query } from "icos-cp-backend";
import localConfig from '../config';
import commonConfig from '../../../common/main/config';
import {sparqlFetchAndParse} from './SparqlFetch'
import { sparqlParsers } from "./sparql";
import { UrlStr } from "./declarations";
import {distinct} from '../utils';
import { envriFilteringFromClauses, objectFilterClauses } from "../sparqlQueries";
import { QueryParameters } from "../actions/types";

export type SpecLookupByKeyword = {[keyword: string]: UrlStr[] | undefined}


export default{
	fetch: function(query: QueryParameters, endpoint: UrlStr = commonConfig.sparqlEndpoint): Promise<string[]>{
		return getUniqueKeywords(query, endpoint);
	}
}
const config = Object.assign(commonConfig, localConfig);

//proj keywords are inherited
export function specKeywordsQuery(): Query<'spec' | 'keywords', never>{
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

function getUniqueKeywords(query: QueryParameters, endpoint: UrlStr = commonConfig.sparqlEndpoint): Promise<string[]>{
	return sparqlFetchAndParse(
		filteredKeywordsQuery(query, endpoint === commonConfig.sparqlEndpoint),
		endpoint,
		b => ({
			keyword: sparqlParsers.fromCommaSepListString(b.keyword)
		})
	).then(res => distinct(res.rows.flatMap(r => r.keyword)));
}

function filteredKeywordsQuery(params: QueryParameters, virtuoso: boolean = true): Query<'keyword', never>{
	const prefixes: string = `
		prefix cpmeta: <${config.cpmetaOntoUri}>
		prefix prov: <http://www.w3.org/ns/prov#>
		prefix xsd: <http://www.w3.org/2001/XMLSchema#>
		prefix geo: <http://www.opengis.net/ont/geosparql#>`

	if (virtuoso) {
		return {text:
			`# filteredKeywordsQuery
			${prefixes}
			select distinct ?keyword
			where {
				${objectFilterClauses(params)} .
				?dobj cpmeta:hasKeyword ?keyword
			}`
		};
	} else {
		return {text:
			`# filteredKeywordsQuery
			${prefixes}
			select (cpmeta:distinct_keywords() as ?keyword)
			${envriFilteringFromClauses}
			where {
				${objectFilterClauses(params)}
			}`
		};
	}
}
