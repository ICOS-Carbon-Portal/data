import commonConfig from '../../common/main/config';
import localConfig from './config';
import {Query} from 'icos-cp-backend';
import {QueryParameters} from "./actions/types";
import {
	FilterRequest,
	TemporalFilterRequest,
	isPidFilter,
	isTemporalFilter,
	isDeprecatedFilter,
	DeprecatedFilterRequest, isNumberFilter, NumberFilterRequest,
	VariableFilterRequest, isVariableFilter, KeywordFilterRequest, isKeywordsFilter
} from './models/FilterRequest';
import {Filter, Value} from "./models/SpecTable";
import { UrlStr } from './backend/declarations';


const config = Object.assign(commonConfig, localConfig);

export const SPECCOL = 'spec';

export type SpecBasicsQuery = Query<"spec" | "type" | "level" | "format" | "theme", "dataset" | "temporalResolution">

export function specBasics(): SpecBasicsQuery {
	const text = `# specBasics
prefix cpmeta: <${config.cpmetaOntoUri}>
select ?spec (?spec as ?type) ?level ?dataset ?format ?theme ?temporalResolution
where{
	?spec cpmeta:hasDataLevel ?level .
	FILTER NOT EXISTS {?spec cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	?spec cpmeta:hasDataTheme ?theme .
	OPTIONAL{
		?spec cpmeta:containsDataset ?dataset .
		OPTIONAL{?dataset cpmeta:hasTemporalResolution ?temporalResolution}
	}
	?spec cpmeta:hasFormat ?format .
}`;

	return {text};
}

export type SpecVarMetaQuery = Query<"spec" | "variable" | "varTitle" | "valType" | "quantityUnit", "quantityKind">

export function specColumnMeta(): SpecVarMetaQuery {
	const text = `# specColumnMeta
prefix cpmeta: <${config.cpmetaOntoUri}>
select distinct ?spec ?variable ?varTitle ?valType ?quantityKind
(if(bound(?unit), ?unit, "(not applicable)") as ?quantityUnit)
where{
	?spec cpmeta:containsDataset ?datasetSpec .
	FILTER NOT EXISTS {?spec cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	FILTER EXISTS {[] cpmeta:hasObjectSpec ?spec}
	{
		{
			?datasetSpec cpmeta:hasColumn ?variable .
			?variable cpmeta:hasColumnTitle ?varTitle .
		} UNION {
			?datasetSpec cpmeta:hasVariable ?variable .
			?variable cpmeta:hasVariableTitle ?varTitle .
		}
	}
	FILTER NOT EXISTS {?variable cpmeta:isQualityFlagFor [] }
	?variable cpmeta:hasValueType ?valType .
	OPTIONAL{?valType cpmeta:hasUnit ?unit }
	OPTIONAL{?valType cpmeta:hasQuantityKind ?quantityKind }
}`;

	return {text};
}

export type DobjOriginsAndCountsQuery = Query<"spec" | "submitter" | "project" | "count", "station" | "ecosystem" | "location" | "site">

export function dobjOriginsAndCounts(filters: FilterRequest[]): DobjOriginsAndCountsQuery {
	const siteQueries = config.envri === "SITES" ?
		`?site cpmeta:hasEcosystemType ?ecosystem .
		?site cpmeta:hasSpatialCoverage ?location .`
		: "";

	const text = `# dobjOriginsAndCounts
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?spec ?submitter ?project ?count ?station ?ecosystem ?location ?site
where{
	{
		select ?station ?site ?submitter ?spec (count(?dobj) as ?count) where{
			?dobj cpmeta:wasSubmittedBy/prov:wasAssociatedWith ?submitter .
			?dobj cpmeta:hasObjectSpec ?spec .
			OPTIONAL {?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station }
			OPTIONAL {?dobj cpmeta:wasAcquiredBy/cpmeta:wasPerformedAt ?site }
			?dobj cpmeta:hasSizeInBytes ?size .
			${getFilterClauses(filters, true)}
		}
		group by ?spec ?submitter ?station ?site
	}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	?spec cpmeta:hasAssociatedProject ?project .
	${siteQueries}
	FILTER NOT EXISTS {?project cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	}`;

	return {text};
}

export function labelLookup(): Query<'uri' | 'label', 'stationId'> {
	let text = `# labelLookup
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select distinct ?uri ?label ?stationId
from <http://meta.icos-cp.eu/ontologies/cpmeta/>
from <${config.metaResourceGraph[config.envri]}>`;

	if (config.envri === "ICOS"){
		text += `
from <http://meta.icos-cp.eu/resources/icos/>
from <http://meta.icos-cp.eu/resources/extrastations/>
from named <http://meta.icos-cp.eu/resources/wdcgg/>
where {
	{?uri rdfs:label ?label } UNION {?uri cpmeta:hasName ?label} UNION {
		graph <http://meta.icos-cp.eu/resources/wdcgg/> {
			?uri a cpmeta:Station .
			?uri cpmeta:hasName ?label .
		}
	}
	optional {?uri cpmeta:hasStationId ?stationId }
}`;
	} else {
		text += `
where {
	{?uri rdfs:label ?label } UNION {?uri cpmeta:hasName ?label}
}`;
	}

	return {text};
}

export function findDobjs(search: string): Query<"dobj", never> {
	const text = `# findDobjs
prefix cpmeta: <${config.cpmetaOntoUri}>
SELECT ?dobj WHERE{
	?dobj  cpmeta:hasObjectSpec ?spec.
	FILTER NOT EXISTS {?spec cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	${deprecatedFilterClause}
	FILTER CONTAINS(LCASE(REPLACE(STR(?dobj), "${config.cpmetaObjectUri}", "")), LCASE("${search}"))
}`;

	return {text};
}

export function findStations(search: string){
	return `# findStations
PREFIX cpst: <http://meta.icos-cp.eu/ontologies/stationentry/>
SELECT DISTINCT (str(?lName) AS ?Long_name)
FROM <http://meta.icos-cp.eu/resources/stationentry/>
WHERE {
  ?s cpst:hasLongName ?lName .
  FILTER CONTAINS(LCASE(STR(?lName)), LCASE("${search}"))
}
ORDER BY ?Long_name`;
}

const deprecatedFilterClause = "FILTER NOT EXISTS {[] cpmeta:isNextVersionOf ?dobj}";
const submTimeDef = "?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .";
const timeStartDef = "?dobj cpmeta:hasStartTime | (cpmeta:wasAcquiredBy / prov:startedAtTime) ?timeStart .";
const timeEndDef = "?dobj cpmeta:hasEndTime | (cpmeta:wasAcquiredBy / prov:endedAtTime) ?timeEnd .";

const standardDobjPropsDef =
`?dobj cpmeta:hasSizeInBytes ?size .
?dobj cpmeta:hasName ?fileName .
${submTimeDef}
${timeStartDef}
${timeEndDef}`;

export type ObjInfoQuery = Query<"dobj" | "spec" | "fileName" | "size" | "submTime" | "timeStart" | "timeEnd", never>

export const listKnownDataObjects = (dobjs: string[]): ObjInfoQuery => {
	const values = dobjs.map(d => `<${config.cpmetaObjectUri}${d}>`).join(' ');
	const text = `# listKnownDataObjects
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?spec ?fileName ?size ?submTime ?timeStart ?timeEnd
where {
VALUES ?dobj { ${values} }
?dobj cpmeta:hasObjectSpec ?spec .
${standardDobjPropsDef}
}`;

	return {text};
};

export const listFilteredDataObjects = (query: QueryParameters): ObjInfoQuery => {

	function isEmpty(arr: Filter) {return !arr || !arr.length;}

	const {specs, stations, submitters, sites, sorting, paging, filters} = query;
	const pidsList = filters.filter(isPidFilter).flatMap(filter => filter.pids);

	const pidListFilter = pidsList.length == 0
		? ''
		: `VALUES ?dobj { ${pidsList.map(fr => `<${config.cpmetaObjectUri}${fr}>`).join(" ")} }\n`;

	const specsValues = isEmpty(specs)
		? `?${SPECCOL} cpmeta:hasDataLevel [] .
			FILTER(STRSTARTS(str(?${SPECCOL}), "${config.sparqlGraphFilter}"))
			FILTER NOT EXISTS {?${SPECCOL} cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}`
		: `VALUES ?${SPECCOL} {<${ (specs as Value[]).join('> <') }>}`;

	const submitterSearch = isEmpty(submitters) ? ''
		: `VALUES ?submitter {<${(submitters as Value[]).join('> <')}>}
			?dobj cpmeta:wasSubmittedBy/prov:wasAssociatedWith ?submitter .`;

	const dobjStation = '?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ';

	const noStationFilter = `FILTER NOT EXISTS{${dobjStation} []}`;

	function stationsFilter(stations: any[]){
		return `VALUES ?station {<${stations.join('> <')}>}` +
			'\n' + dobjStation + '?station .';
	}

	//TODO Investigate if this empty-station case handling is still needed, and if yes, apply it to sites
	const stationSearch = isEmpty(stations) ? '' : (stations as Value[]).some((s: any) => !s)
		? (stations as Value[]).length === 1
			? noStationFilter
			: `{{
					${noStationFilter}
				} UNION {
					${stationsFilter((stations as Value[]).filter((s: any) => !!s))}
				}}`
		: stationsFilter((stations as Value[]));

	const siteSearch = !sites || isEmpty(sites.filter(Value.isDefined))
				? ''
				: `VALUES ?site {<${sites.filter(Value.isDefined).join('> <')}>}
				?dobj cpmeta:wasAcquiredBy/cpmeta:wasPerformedAt ?site .`;

	const orderBy = (sorting && sorting.varName)
		? (
			sorting.ascending
				? `order by ?${sorting.varName}`
				: `order by desc(?${sorting.varName})`
		)
		: '';

	const text = `# listFilteredDataObjects
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?${SPECCOL} ?fileName ?size ?submTime ?timeStart ?timeEnd ?samplingHeight
where {
	${pidListFilter}${specsValues}
	?dobj cpmeta:hasObjectSpec ?${SPECCOL} .
	${stationSearch}
	${siteSearch}
	${submitterSearch}
	${standardDobjPropsDef}
	${getFilterClauses(filters, false)}
}
${orderBy}
offset ${paging.offset || 0} limit ${paging.limit || 20}`;

	return {text};
};

function getFilterClauses(allFilters: FilterRequest[], supplyVarDefs: boolean): string {
	const deprFilter = allFilters.find(isDeprecatedFilter);
	const deprFilterStr = (deprFilter && deprFilter.allow) ? '' : deprecatedFilterClause.concat('\n');

	const tempFilters = allFilters.filter(isTemporalFilter);
	const numFilters = allFilters.filter(isNumberFilter);

	const tempVarDefs = supplyVarDefs ? tempFilters.flatMap(getTempVarDefs) : [];
	const varDefs = tempVarDefs.concat(numFilters.flatMap(getNumVarDefs));
	const distinctVarDefs = varDefs.filter((s, i) => varDefs.indexOf(s) === i);
	const varDefStr = distinctVarDefs.map(s => `${s}\n`).join("");

	const tempFilterStr = tempFilters
		.map(getTempFilterConds)
		.filter(nf => nf.length)
		.map(nf => `FILTER( ${nf.join(' && ')} )`)
		.join('\n');

	const numFilterStr = numFilters
		.map(getNumberFilterConds)
		.map(nf => `FILTER( ${nf} )`)
		.join('\n');

	const filterConds: string[] = [tempFilterStr].concat(numFilterStr);
	const filterStr = filterConds.length ? `${varDefStr}${filterConds.join('\n')}` : '';
	const varNameFilterStr = allFilters.filter(isVariableFilter).map(getVarFilter).join('');

	return deprFilterStr.concat(filterStr, varNameFilterStr, getKeywordFilter(allFilters, supplyVarDefs));
}

function getKeywordFilter(allFilters: FilterRequest[], supplyVarDefs: boolean): string{
	const requests = allFilters.filter(isKeywordsFilter);
	if(requests.length === 0) return '';
	if(requests.length > 1) throw new Error("Got multiple KeywordFilterRequests, expected at most one");
	const req = requests[0];

	const noDobjKws = req.dobjKeywords.length === 0;
	const noSpecs = req.specs.length === 0;

	const specsFilter = noSpecs ? '' : `VALUES ?${SPECCOL} {<${req.specs.join('> <') }>}`;
	const dobjKwsFilter = noDobjKws ? '' :
	`VALUES ?keyword {${req.dobjKeywords.map(kw => `"${kw}"^^xsd:string`).join(' ')}}
	?dobj cpmeta:hasKeyword ?keyword`;

	return noDobjKws && noSpecs ? '' : `
		` + (noDobjKws ? specsFilter : noSpecs ? dobjKwsFilter : `{
			{${specsFilter}}
			UNION
			{${dobjKwsFilter}}
		}`
	);
}

function getNumberFilterConds(numberFilter: NumberFilterRequest): string {
	const varName = getNumVarName(numberFilter);
	const xsdType = getXsdType(numberFilter);
	const {type, vals, cmp} = numberFilter;

	function cond(op: string, val: number): string{
		return `?${varName} ${op} "${val}"^^xsd:${xsdType}`;
	}

	switch(type){
		case "limit":
			return cond(cmp[0], vals[0]);

		case "span":
			return [cond(cmp[0], vals[0]), cond(cmp[1], vals[1])].join(' && ');

		case "list":
			return vals.map((val, i) => cond(cmp[i], val)).join(' || ');

		default:
			return '';
	}
}

function getNumVarDefs(filter: NumberFilterRequest): string[]{
	switch(filter.category){
		case "fileSize": return [];
		case "samplingHeight": return ["?dobj cpmeta:wasAcquiredBy / cpmeta:hasSamplingHeight ?samplingHeight ."];
	}
}

function getXsdType(filter: NumberFilterRequest): string{
	switch(filter.category){
		case "fileSize": return "long";
		case "samplingHeight": return "float";
	}
}

function getNumVarName(filter: NumberFilterRequest): string{
	switch(filter.category){
		case "fileSize": return "size";
		case "samplingHeight": return filter.category;
	}
}

function getTempVarDefs(filter: TemporalFilterRequest): string[]{
	const res: string[] = [];
	switch(filter.category){
		case "dataTime":
			if(filter.fromDateTimeStr) res.push(timeStartDef);
			if(filter.toDateTimeStr) res.push(timeEndDef);
			break;
		case "submission":
			if(filter.fromDateTimeStr || filter.toDateTimeStr) res.push(submTimeDef);
	}
	return res;
}

function getTempFilterConds(filter: TemporalFilterRequest): string[]{
	const res: string[] = [];

	function add(varName: "timeStart" | "timeEnd" | "submTime", cmp: ">=" | "<=", timeStr: string | undefined): void{
		if(timeStr) res.push(`?${varName} ${cmp} '${timeStr}'^^xsd:dateTime`);
	}
	switch(filter.category){
		case "dataTime":
			add("timeStart", ">=", filter.fromDateTimeStr);
			add("timeEnd",   "<=", filter.toDateTimeStr);
			break;
		case "submission":
			add("submTime",  ">=", filter.fromDateTimeStr);
			add("submTime",  "<=", filter.toDateTimeStr);
			break;
	}
	return res;
}

function getVarFilter(filter: VariableFilterRequest): string{
	function cond(varName: string): string{
		if(varName.startsWith("^") && varName.endsWith("$")) {
			const patt = varName.replace(/\\/gi, '\\\\');
			return `regex(?varName, "${patt}")`
		} else
			return `?varName = "${varName}"`
	}
	if(filter.names.length == 0) return '';
	return `
	{
		{FILTER NOT EXISTS {?dobj cpmeta:hasVariableName ?varName}}
		UNION
		{
			?dobj cpmeta:hasVariableName ?varName
			FILTER (${filter.names.map(cond).join(' || ')})
		}
	}`;
}

export const extendedDataObjectInfo = (dobjs: UrlStr[]): Query<"dobj", "station" | "stationId" | "samplingHeight" | "theme" | "themeIcon" | "title" | "description" | "columnNames" | "site"> => {
	const dobjsList = dobjs.map(dobj => `<${dobj}>`).join(' ');
	const text = `# extendedDataObjectInfo
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select distinct ?dobj ?station ?stationId ?samplingHeight ?theme ?themeIcon ?title ?description ?columnNames ?site where{
	{
		select ?dobj (min(?station0) as ?station) (sample(?stationId0) as ?stationId) (sample(?samplingHeight0) as ?samplingHeight) (sample(?site0) as ?site) where{
			VALUES ?dobj { ${dobjsList} }
			OPTIONAL{
				?dobj cpmeta:wasAcquiredBy ?acq.
				?acq prov:wasAssociatedWith ?stationUri .
				OPTIONAL{ ?stationUri cpmeta:hasName ?station0 }
				OPTIONAL{ ?stationUri cpmeta:hasStationId ?stationId0 }
				OPTIONAL{ ?acq cpmeta:hasSamplingHeight ?samplingHeight0 }
				OPTIONAL{ ?acq cpmeta:wasPerformedAt/cpmeta:hasSpatialCoverage/rdfs:label ?site0 }
			}
		}
		group by ?dobj
	}
	?dobj cpmeta:hasObjectSpec ?specUri .
	OPTIONAL{ ?specUri cpmeta:hasDataTheme [
		rdfs:label ?theme ;
		cpmeta:hasIcon ?themeIcon
	]}
	OPTIONAL{ ?dobj <http://purl.org/dc/terms/title> ?title }
	OPTIONAL{ ?dobj <http://purl.org/dc/terms/description> ?description }
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
}`;

	return {text};
};

export const resourceHelpInfo = (uriList: UrlStr[]): Query<"uri" | "label", "comment" | "webpage"> => {
	const text = `select * where{
	VALUES ?uri { ${uriList.map(uri => '<' + uri + '>').join(' ')} }
	?uri rdfs:label ?label .
	OPTIONAL{?uri rdfs:comment ?comment}
	OPTIONAL{?uri rdfs:seeAlso ?webpage}
}
order by ?label`;

	return {text};
};
