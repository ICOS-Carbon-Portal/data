import { Query } from "icos-cp-backend";
import config from '../config';
import commonConfig from '../../../common/main/config';
import {sparqlFetchAndParse} from './SparqlFetch'
import { sparqlParsers } from "./sparql";
import { UrlStr } from "./declarations";
import {distinct} from '../utils';
import {objectFilterClauses, objectFilterPrefixes} from '../sparqlQueries';
import { QueryParameters } from "../actions/types";

export type SpecLookupByKeyword = {[keyword: string]: UrlStr[] | undefined}

export interface KeywordsInfo{
	filteredKeywords: string[]
}

export default{
	fetch: function(query: QueryParameters): Promise<KeywordsInfo>{
		return Promise.all([getUniqueKeywords(query)]).then(
			([filteredKeywords]) => ({ filteredKeywords })
		);
	},

	allKeywords: function(info: KeywordsInfo): string[]{
		return info.filteredKeywords
	}
}


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

function getUniqueKeywords(query: QueryParameters): Promise<string[]>{
	return sparqlFetchAndParse(
		filteredKeywordsQuery(query),
		commonConfig.sparqlEndpoint,
		b => ({
			keywords: sparqlParsers.fromCommaSepListString(b.keywords)
		})
	).then(res => distinct(res.rows.flatMap(r => r.keywords)));
}

function filteredKeywordsQuery(query: QueryParameters): Query<'keywords', never>{
	const text = `# filteredKeywordsQuery
${objectFilterPrefixes}
select (cpmeta:distinct_keywords() as ?keywords) where{
	${objectFilterClauses(query)}
}`;
	return {text};
}
