import commonConfig from '../../common/main/config';
import localConfig from './config';
import { Query } from 'icos-cp-backend';
import { QueryParameters } from "./actions/types";
import {
	FilterRequest,
	TemporalFilterRequest,
	isPidFilter,
	isTemporalFilter,
	isDeprecatedFilter,
	isNumberFilter, NumberFilterRequest,
	VariableFilterRequest, isVariableFilter, isKeywordsFilter
} from './models/FilterRequest';
import { Value } from "./models/SpecTable";
import { UrlStr } from './backend/declarations';


const config = Object.assign(commonConfig, localConfig);

export const SPECCOL = 'spec';

export type SpecBasicsQuery = Query<"spec" | "type" | "level" | "format" | "theme", "dataset" | "temporalResolution">

export function specBasics(): SpecBasicsQuery {
	const text = `# specBasics
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
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

	return { text };
}

export type SpecVarMetaQuery = Query<"spec" | "variable" | "varTitle" | "valType" | "quantityUnit", "quantityKind">

export function specColumnMeta(): SpecVarMetaQuery {
	const text = `# specColumnMeta
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
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

	return { text };
}

export type DobjOriginsAndCountsQuery = Query<"spec" | "submitter" | "project" | "count", "station" | "countryCode" | "ecosystem" | "location" | "site" | "stationclass">

export function dobjOriginsAndCounts(filters: FilterRequest[]): DobjOriginsAndCountsQuery {
	const siteQueries = config.envri === "SITES"
		? `?site cpmeta:hasEcosystemType ?ecosystem .\n\t?site cpmeta:hasSpatialCoverage ?location .`
		: `BIND (COALESCE(?station, <http://dummy>) as ?boundStation)
	OPTIONAL {?boundStation cpmeta:hasEcosystemType ?ecosystem}
	OPTIONAL {?boundStation cpmeta:countryCode ?countryCode}
	OPTIONAL {?boundStation cpmeta:hasStationClass ?stClassOpt}`;

	const text = `# dobjOriginsAndCounts
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
select ?spec ?countryCode ?submitter ?project ?count ?station ?ecosystem ?location ?site ?stationclass
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
	BIND (IF(
		bound(?stClassOpt),
		IF(strstarts(?stClassOpt, "Ass"), "Associated", "ICOS"),
		IF(bound(?station), "Other", ?stClassOpt)
	) as ?stationclass)
	FILTER NOT EXISTS {?project cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	}`;

	return { text };
}

export function labelLookup(): Query<'uri' | 'label' , 'stationId' | 'comment' | 'webpage'> {
	let text = `# labelLookup
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>

select ?uri ?label ?comment ?stationId ?webpage
from <http://meta.icos-cp.eu/ontologies/cpmeta/>
from <${config.metaResourceGraph[config.envri]}>`;

	if (config.envri === "ICOS") {
		text += `
from <http://meta.icos-cp.eu/resources/icos/>
from <http://meta.icos-cp.eu/resources/extrastations/>`;
	}
	text +=`
where {
	?uri a ?class .
	optional {?uri rdfs:label ?rdfsLabel }
	optional {?uri cpmeta:hasName ?name}
	bind(coalesce(?name, ?rdfsLabel) as ?label)
	filter(
		bound(?label) &&
		?class != cpmeta:Instrument && ?class != cpmeta:Membership &&
		!strstarts(str(?class), "http://www.w3.org/2002/07/owl#")
	)
	optional {?uri cpmeta:hasStationId ?stationId }
	optional {?uri rdfs:comment ?comment }
	optional {?uri rdfs:seeAlso ?webpage}
}`;
	return { text };
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

	return { text };
}

export function getDobjByFileName(fileName: string): Query<"dobj", never> {
	const text = `# getDobjByFileName
prefix cpmeta: <${config.cpmetaOntoUri}>
select ?dobj
where {
?dobj cpmeta:hasName '${fileName}'
filter not exists{ [] cpmeta:isNextVersionOf ?dobj }
}`;

	return { text };
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

export type ObjInfoQuery = Query<"dobj" | "spec" | "fileName" | "size" | "submTime" | "timeStart" | "timeEnd" | "hasVarInfo", never>

export const listKnownDataObjects = (dobjs: string[]): ObjInfoQuery => {
	const values = dobjs.map(d => `<${config.cpmetaObjectUri}${d}>`).join(' ');
	const text = `# listKnownDataObjects
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?spec ?fileName ?size ?submTime ?timeStart ?timeEnd ?hasVarInfo
where {
VALUES ?dobj { ${values} }
?dobj cpmeta:hasObjectSpec ?spec .
${standardDobjPropsDef}
OPTIONAL {
	BIND ("true"^^xsd:boolean as ?hasVarInfo)
	filter exists{?dobj cpmeta:hasActualVariable [] }
}
}`;

	return { text };
};

export const listFilteredDataObjects = (query: QueryParameters): ObjInfoQuery => {

	const { specs, stations, submitters, sites, sorting, paging, filters, countryCodes } = query;
	const pidsList = filters.filter(isPidFilter).flatMap(filter => filter.pids);

	const pidListFilter = pidsList.length == 0
		? ''
		: `VALUES ?dobj { ${pidsList.map(fr => `<${config.cpmetaObjectUri}${fr}>`).join(" ")} }\n`;

	const specsValues = specs == null
		? `?${SPECCOL} cpmeta:hasDataLevel [] .
			FILTER(STRSTARTS(str(?${SPECCOL}), "${config.sparqlGraphFilter}"))
			FILTER NOT EXISTS {?${SPECCOL} cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}`
		: `VALUES ?${SPECCOL} {<${specs.join('> <')}>}`;

	const submitterSearch = submitters == null ? ''
		: `VALUES ?submitter {<${submitters.join('> <')}>}
			?dobj cpmeta:wasSubmittedBy/prov:wasAssociatedWith ?submitter .`;

	const countryCodesSearch = countryCodes == null ? ''
		: `VALUES ?countryCode {'${countryCodes.join("' '")}'}
			?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith/cpmeta:countryCode ?countryCode .`;

	const stationSearch = stations == null || stations.filter(Value.isDefined).length === 0
		? ''
		: `VALUES ?station {<${stations.filter(Value.isDefined).join('> <')}>}
			?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .`;

	const siteSearch = sites == null || sites.filter(Value.isDefined).length === 0
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
select ?dobj ?${SPECCOL} ?fileName ?size ?submTime ?timeStart ?timeEnd
where {
	${pidListFilter}${specsValues}
	?dobj cpmeta:hasObjectSpec ?${SPECCOL} .
	${stationSearch}
	${siteSearch}
	${submitterSearch}
	${countryCodesSearch}
	${standardDobjPropsDef}
	${getFilterClauses(filters, false)}
}
${orderBy}
offset ${paging.offset || 0} limit ${paging.limit || 20}`;

	return { text };
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
		.filter(tf => tf.length)
		.map(tf => `FILTER( ${tf} ) `)
		.join('\n');

	const numFilterStr = numFilters
		.map(getNumberFilterConds)
		.map(nf => `FILTER( ${nf} )`)
		.join('\n');

	const filterConds: string[] = [tempFilterStr].concat(numFilterStr);
	const filterStr = filterConds.length ? `${varDefStr}${filterConds.join('\n')}` : '';
	const varNameFilterStr = allFilters.filter(isVariableFilter).map(getVarFilter).join('');

	return deprFilterStr.concat(filterStr, varNameFilterStr, getKeywordFilter(allFilters));
}

function getKeywordFilter(allFilters: FilterRequest[]): string {
	const requests = allFilters.filter(isKeywordsFilter);
	if (requests.length === 0) return '';
	if (requests.length > 1) throw new Error("Got multiple KeywordFilterRequests, expected at most one");
	const req = requests[0];

	const noDobjKws = req.dobjKeywords.length === 0;
	const noSpecs = req.specs.length === 0;

	const specsFilter = noSpecs ? '' : `VALUES ?${SPECCOL} {<${req.specs.join('> <')}>}`;
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
	const { type, vals, cmp } = numberFilter;

	function cond(op: string, val: number): string {
		return `?${varName} ${op} "${val}"^^xsd:${xsdType}`;
	}

	switch (type) {
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

function getNumVarDefs(filter: NumberFilterRequest): string[] {
	switch (filter.category) {
		case "fileSize": return [];
		case "samplingHeight": return ["?dobj cpmeta:wasAcquiredBy / cpmeta:hasSamplingHeight ?samplingHeight ."];
	}
}

function getXsdType(filter: NumberFilterRequest): string {
	switch (filter.category) {
		case "fileSize": return "long";
		case "samplingHeight": return "float";
	}
}

function getNumVarName(filter: NumberFilterRequest): string {
	switch (filter.category) {
		case "fileSize": return "size";
		case "samplingHeight": return filter.category;
	}
}

function getTempVarDefs(filter: TemporalFilterRequest): string[] {
	const res: string[] = [];
	switch (filter.category) {
		case "dataTime":
			if (filter.fromDateTimeStr || filter.toDateTimeStr) {
				res.push(timeEndDef);
				res.push(timeStartDef);
			}
			break;
		case "submission":
			if (filter.fromDateTimeStr || filter.toDateTimeStr) res.push(submTimeDef);
	}
	return res;
}

function getTempFilterConds(filter: TemporalFilterRequest): string {
	const { category, fromDateTimeStr, toDateTimeStr } = filter;

	if (category === "dataTime" && fromDateTimeStr && toDateTimeStr)
		return `!(?timeStart > '${toDateTimeStr}'^^xsd:dateTime || ?timeEnd < '${fromDateTimeStr}'^^xsd:dateTime)`;

	else if (category === "dataTime" && fromDateTimeStr)
		return `'${fromDateTimeStr}'^^xsd:dateTime <= ?timeEnd`;

	else if (category === "dataTime" && toDateTimeStr)
		return `'${toDateTimeStr}'^^xsd:dateTime >= ?timeStart`;

	else if (category === "submission" && fromDateTimeStr && toDateTimeStr)
		return `?submTime >= '${fromDateTimeStr}'^^xsd:dateTime && ?submTime <= '${toDateTimeStr}'^^xsd:dateTime`;

	else if (category === "submission" && fromDateTimeStr)
		return `?submTime >= '${fromDateTimeStr}'^^xsd:dateTime`;

	else if (category === "submission" && toDateTimeStr)
		return `?submTime <= '${toDateTimeStr}'^^xsd:dateTime`;

	else
		return '';
}

function getVarFilter(filter: VariableFilterRequest): string {
	function cond(varName: string): string {
		if (varName.startsWith("^") && varName.endsWith("$")) {
			const patt = varName.replace(/\\/gi, '\\\\');
			return `regex(?varName, "${patt}")`
		} else
			return `?varName = "${varName}"`
	}
	if (filter.names.length == 0) return '';
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

export const extendedDataObjectInfo = (dobjs: UrlStr[]): Query<"dobj", "station" | "stationId" | "samplingHeight" | "samplingPoint" | "theme" | "themeIcon" | "title" | "description" | "columnNames" | "site" | "hasVarInfo" | "dois" | "biblioInfo"> => {
	const dobjsList = dobjs.map(dobj => `<${dobj}>`).join(' ');
	const text = `# extendedDataObjectInfo
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
prefix dcterms: <http://purl.org/dc/terms/>
select distinct ?dobj ?station ?stationId ?samplingHeight ?samplingPoint ?theme ?themeIcon ?title ?description ?columnNames ?site ?hasVarInfo ?dois ?biblioInfo where{
	{
		select ?dobj (min(?station0) as ?station) (sample(?stationId0) as ?stationId) (sample(?samplingHeight0) as ?samplingHeight) (sample(?samplingPoint0) as ?samplingPoint) (sample(?site0) as ?site) (group_concat(?doi ; separator="|") as ?dois) where{
			VALUES ?dobj { ${dobjsList} }
			OPTIONAL{
				?dobj cpmeta:wasAcquiredBy ?acq.
				?acq prov:wasAssociatedWith ?stationUri .
				OPTIONAL{ ?stationUri cpmeta:hasName ?station0 }
				OPTIONAL{ ?stationUri cpmeta:hasStationId ?stationId0 }
				OPTIONAL{ ?acq cpmeta:hasSamplingHeight ?samplingHeight0 }
				OPTIONAL{ ?acq cpmeta:hasSamplingPoint/rdfs:label ?samplingPoint0 }
				OPTIONAL{ ?acq cpmeta:wasPerformedAt/cpmeta:hasSpatialCoverage/rdfs:label ?site0 }
			}
			OPTIONAL{
				?coll dcterms:hasPart ?dobj ; cpmeta:hasDoi ?doi .
				filter not exists{[] cpmeta:isNextVersionOf ?coll ; dcterms:hasPart ?dobj}
			}
		}
		group by ?dobj
	}
	?dobj cpmeta:hasObjectSpec ?specUri .
	OPTIONAL{ ?specUri cpmeta:hasDataTheme [
		rdfs:label ?theme ;
		cpmeta:hasIcon ?themeIcon
	]}
	OPTIONAL{ ?dobj dcterms:title ?title }
	OPTIONAL{ ?dobj dcterms:description ?description }
	OPTIONAL{ ?dobj cpmeta:hasActualColumnNames ?columnNames }
	OPTIONAL{ ?dobj cpmeta:hasActualVariable [].BIND ("true"^^xsd:boolean as ?hasVarInfo) }
	OPTIONAL{ ?dobj cpmeta:hasBiblioInfo ?biblioInfo}
}`;

	return { text };
};

export const stationPositions = (): Query<"station" | "lat" | "lon", never> => {
	const text = `# stationPositions
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT * WHERE {
	?station a/rdfs:subClassOf* cpmeta:Station ;
		cpmeta:hasLatitude ?lat ;
		cpmeta:hasLongitude ?lon .
}`;
	
	return { text };
};

export const resourceHelpInfo = (uriList: UrlStr[]): Query<"uri" | "label", "comment" | "webpage"> => {
	const text = `select * where{
	VALUES ?uri { ${uriList.map(uri => '<' + uri + '>').join(' ')} }
	?uri rdfs:label ?label .
	OPTIONAL{?uri rdfs:comment ?comment}
	OPTIONAL{?uri rdfs:seeAlso ?webpage}
}
order by ?label`;

	return { text };
};
