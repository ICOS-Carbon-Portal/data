import { Query } from "icos-cp-backend";
import config from '../config';
import commonConfig from '../../../common/main/config';
import {sparqlFetchAndParse} from './SparqlFetch'
import { sparqlParsers } from "./sparql";
import { UrlStr } from "./declarations";
import {distinct} from '../utils';


export type SpecLookupByKeyword = {[keyword: string]: UrlStr[] | undefined}

export interface KeywordsInfo{
	specLookup: SpecLookupByKeyword,
	dobjKeywords: string[]
}

export default{
	fetch: async function(): Promise<KeywordsInfo>{
		const [specLookup, dobjKeywords] = await Promise.all([getSpecLookup(), getDobjLevelKeywords()]);
		return { specLookup, dobjKeywords };
	},

	allKeywords: function(info: KeywordsInfo): string[]{
		return distinct(Object.keys(info.specLookup).concat(info.dobjKeywords));
	},

	lookupSpecs(info: KeywordsInfo, keywords: string[]): UrlStr[]{
		return distinct(keywords.flatMap(kw => info.specLookup[kw] || []));
	}
}

function getSpecLookup(): Promise<SpecLookupByKeyword> {
	return sparqlFetchAndParse(
		specKeywordsQuery(),
		commonConfig.sparqlEndpoint,
		b => ({
			spec: sparqlParsers.fromUrl(b.spec),
			keywords: sparqlParsers.fromCommaSepListString(b.keywords)
		})
	).then(res => res.rows
		.flatMap(r => r.keywords.map(kw => [kw, r.spec]))
		.reduce(
			(acc, pair) => {
				const [keyword, spec] = pair;
				const specs: UrlStr[] = acc[keyword] || [];
				if(!specs.includes(spec)) {
					specs.push(spec);
					acc[keyword] = specs;
				}
				return acc;
			},
			{} as SpecLookupByKeyword
		)
	)
}


//proj keywords are inherited
function specKeywordsQuery(): Query<'spec' | 'keywords', never>{
	const text = `# spec keywords
prefix cpmeta: <${commonConfig.cpmetaOntoUri}>
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

function getDobjLevelKeywords(): Promise<string[]>{
	return sparqlFetchAndParse(
		dobjLevelKeywordsQuery(),
		commonConfig.sparqlEndpoint,
		b => ({
			keywords: sparqlParsers.fromCommaSepListString(b.keywords)
		})
	).then(res => distinct(res.rows.flatMap(r => r.keywords)))
}

function dobjLevelKeywordsQuery(): Query<'keywords', never>{
	const text = `# data(/doc)-object-specific keywords
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select distinct ?keywords where{
	?dobj cpmeta:hasKeywords ?keywords .
	FILTER(strstarts(str(?dobj), '${config.objectUriPrefix[config.envri]}'))
}`;
	return {text};
}
