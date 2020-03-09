import commonConfig from '../../common/main/config';
import localConfig from './config';
import {Query} from 'icos-cp-backend';
import {Options} from "./actions/types";
import {
	FilterRequest,
	TemporalFilterRequest,
	isPidFilter,
	isTemporalFilter,
	isDeprecatedFilter,
	DeprecatedFilterRequest, isNumberFilter, NumberFilterRequest
} from './models/FilterRequest';
import {Filter, Value} from "./models/SpecTable";


const config = Object.assign(commonConfig, localConfig);

export const SPECCOL = 'spec';

const basicColNamesMan = ["spec", "type", "level", "format", "theme"] as const;
const basicColNamesOpt = ["dataset", "temporalResolution"] as const;
export const basicColNames = [...basicColNamesMan, ...basicColNamesOpt];

export function specBasics(deprFilter?: DeprecatedFilterRequest): Query<typeof basicColNamesMan[number], typeof basicColNamesOpt[number]> {
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
	${deprecatedFilter(deprFilter)}
	?spec cpmeta:hasFormat ?format .
}`;

	return {text};
}

const columnMetaColNamesMan = ["spec", "column", "colTitle", "valType", "quantityUnit"] as const;
const columnMetaColNamesOpt = ["quantityKind"] as const;
export const columnMetaColNames = [...columnMetaColNamesMan, ...columnMetaColNamesOpt];

export function specColumnMeta(deprFilter?: DeprecatedFilterRequest): Query<typeof columnMetaColNamesMan[number], typeof columnMetaColNamesOpt[number]> {
	const text = `# specColumnMeta
prefix cpmeta: <${config.cpmetaOntoUri}>
select distinct ?spec ?column ?colTitle ?valType ?quantityKind
(if(bound(?unit), ?unit, "(not applicable)") as ?quantityUnit)
where{
	?spec cpmeta:containsDataset [cpmeta:hasColumn ?column ] .
	FILTER NOT EXISTS {?column cpmeta:isQualityFlagFor [] }
	FILTER NOT EXISTS {?spec cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	FILTER EXISTS {[] cpmeta:hasObjectSpec ?spec}
	?column cpmeta:hasColumnTitle ?colTitle .
	?column cpmeta:hasValueType ?valType .
	${deprecatedFilter(deprFilter)}
	OPTIONAL{?valType cpmeta:hasUnit ?unit }
	OPTIONAL{?valType cpmeta:hasQuantityKind ?quantityKind }
}`;

	return {text};
}

const originsColNamesMan = ["spec", "submitter", "project", "count"] as const;
const originsColNamesOpt = ["station"] as const;
export const originsColNames = [...originsColNamesMan, ...originsColNamesOpt];

export function dobjOriginsAndCounts(filters: FilterRequest[]): Query<typeof originsColNamesMan[number], typeof originsColNamesOpt[number]> {
	const text = `# dobjOriginsAndCounts
prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?spec ?submitter ?project ?count ?station
where{
	{
		select ?station ?submitter ?spec (count(?dobj) as ?count) where{
			?dobj cpmeta:wasSubmittedBy/prov:wasAssociatedWith ?submitter .
			?dobj cpmeta:hasObjectSpec ?spec .
			OPTIONAL {?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station }
			?dobj cpmeta:hasSizeInBytes ?size .
			${getFilterClauses(filters, true)}
		}
		group by ?spec ?submitter ?station
	}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	?spec cpmeta:hasAssociatedProject ?project .
	FILTER NOT EXISTS {?project cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	}`;

	return {text};
}

export function labelLookup(): Query<'uri' | 'label', 'stationId'> {
	let text = `# labelLookup
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select distinct ?uri ?label ?stationId
from <http://meta.icos-cp.eu/ontologies/cpmeta/>`;

	if (config.envri === "ICOS"){
		text += `
from <http://meta.icos-cp.eu/resources/cpmeta/>
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
from <https://meta.fieldsites.se/resources/sites/>
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
const deprecatedFilter = (deprFilter?: DeprecatedFilterRequest) => {
	return (deprFilter && deprFilter.allow)
		? ''
		: `FILTER EXISTS{?dobj cpmeta:hasObjectSpec ?spec . ${deprecatedFilterClause}}`;
};
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

export const listFilteredDataObjects = (options: Options): ObjInfoQuery => {

	function isEmpty(arr: Filter) {return !arr || !arr.length;}

	const {specs, stations, submitters, sorting, paging, filters} = options;
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

	const stationSearch = isEmpty(stations) ? '' : (stations as Value[]).some((s: any) => !s)
		? (stations as Value[]).length === 1
			? noStationFilter
			: `{{
					${noStationFilter}
				} UNION {
					${stationsFilter((stations as Value[]).filter((s: any) => !!s))}
				}}`
		: stationsFilter((stations as Value[]));
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
	const tempConds: string[] = tempFilters.flatMap(getFilterConditions);
	const varDefs = supplyVarDefs ? tempFilters.flatMap(getVarDefs) : [];
	const distinctVarDefs = varDefs.filter((s, i) => varDefs.indexOf(s) === i);
	const varDefStr = distinctVarDefs.map(s => `${s}\n`).join("");

	const tempFilterStr = tempConds.length ? `${varDefStr}FILTER( ${tempConds.join(' && ')} )` : '';

	const numberFilterConds = getNumberFilterConditions(allFilters.filter(isNumberFilter));

	return deprFilterStr.concat(tempFilterStr, '\n', numberFilterConds);
}

function getNumberFilterConditions(filterNumbers: NumberFilterRequest[]){
	return filterNumbers.map(nf => getNumberFilterConds(nf).join('\n')).join('\n');
}

function getNumberFilterConds(numberFilter: NumberFilterRequest) {
	const res: string[] = [numberFilter.sparqlPattern];
	const filter: string = getFilter();

	function getFilter(){
		const {category, type, vals, cmp} = numberFilter;

		switch(type){
			case "limit":
				return `?${category} ${cmp[0]} ${vals[0]}`;

			case "span":
				return `?${category} ${cmp[0]} ${vals[0]} && ?${category} ${cmp[1]} ${vals[1]}`;

			case "list":
				const list = vals.map((val, i) => `?${category} ${cmp[i]} ${val}`);
				return list.join(' || ');

			default:
				return '';
		}
	}

	return res.concat(`filter(${filter}) .`);
}

function getVarDefs(filter: TemporalFilterRequest): string[]{
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

function getFilterConditions(filter: TemporalFilterRequest): string[]{
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

export const extendedDataObjectInfo = (dobjs: string[]): Query<"dobj", "station" | "stationId" | "samplingHeight" | "theme" | "themeIcon" | "title" | "description" | "columnNames" | "site"> => {
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

export const resourceHelpInfo = (uriList: Value[]): Query<"uri", "label" | "comment" | "webpage"> => {
	const text = `select * where{
	VALUES ?uri { ${uriList.map(uri => '<' + uri + '>').join(' ')} }
	?uri rdfs:label ?label .
	OPTIONAL{?uri rdfs:comment ?comment}
	OPTIONAL{?uri rdfs:seeAlso ?webpage}
}
order by ?label`;

	return {text};
};
