export const SPECCOL = 'spec';

export function specBasics(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?spec ?specLabel ?level ?format (if(bound(?themeLbl), ?themeLbl, "(not applicable)") as ?theme)
where{
	?spec cpmeta:hasDataLevel ?level .
	FILTER (?level != "1"^^xsd:integer) #temporary
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	OPTIONAL{ ?spec cpmeta:hasDataTheme/rdfs:label ?themeLbl }
	FILTER EXISTS{[] cpmeta:hasObjectSpec ?spec}
	?spec rdfs:label ?specLabel .
	?spec cpmeta:hasFormat [rdfs:label ?format ]
}`;
}

export function specColumnMeta(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select distinct ?spec ?colTitle ?valType
(if(bound(?qKind), ?qKind, "(not applicable)") as ?quantityKind)
(if(bound(?unit), ?unit, "(not applicable)") as ?quantityUnit)
where{
	?spec cpmeta:containsDataset [cpmeta:hasColumn ?column ] .
	FILTER NOT EXISTS {?spec cpmeta:hasDataLevel "1"^^xsd:integer} #temporary
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	FILTER EXISTS {[] cpmeta:hasObjectSpec ?spec}
	?column cpmeta:hasColumnTitle ?colTitle .
	?column cpmeta:hasValueType ?valTypeRes .
	?valTypeRes rdfs:label ?valType .
	OPTIONAL{?valTypeRes cpmeta:hasQuantityKind [rdfs:label ?qKind] }
	OPTIONAL{?valTypeRes cpmeta:hasUnit ?unit }
}`;
}


export function dobjOriginsAndCounts(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select
?spec
?submitter
?submitterUri
(if(bound(?stationName), ?stationName, "(not applicable)") as ?station)
(if(bound(?stationName), ?stationUri0, ?stationName) as ?stationUri)
?count
(if(?submitterClass = cpmeta:ThematicCenter || ?submitterClass = cpmeta:ES, "ICOS", "Non-ICOS") as ?isIcos)
where{
	{
		select * where{
			[] cpmeta:hasStatProps [
				cpmeta:hasStatCount ?count;
				cpmeta:hasStatStation ?stationUri0;
				cpmeta:hasStatSpec ?spec;
				cpmeta:hasStatSubmitter ?submitterUri
			] .
			OPTIONAL{?stationUri0 cpmeta:hasName ?stationName}
		}
	}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	FILTER NOT EXISTS {?spec cpmeta:hasDataLevel "1"^^xsd:integer} #temporary
	?submitterUri cpmeta:hasName ?submitter ; a ?submitterClass .
	FILTER(?submitterClass != owl:NamedIndividual)
}`;
}

export function findDobjs(config, search){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
SELECT ?dobj WHERE{
  ?dobj  cpmeta:hasObjectSpec ?spec.
  FILTER CONTAINS(LCASE(REPLACE(STR(?dobj), "${config.cpmetaObjectUri}", "")), LCASE("${search}"))
}`;
}

export function findStations(config, search){
	return `PREFIX cpst: <http://meta.icos-cp.eu/ontologies/stationentry/>
SELECT DISTINCT (str(?lName) AS ?Long_name)
FROM <http://meta.icos-cp.eu/resources/stationentry/>
WHERE {
  ?s cpst:hasLongName ?lName .
  FILTER CONTAINS(LCASE(STR(?lName)), LCASE("${search}"))
}
ORDER BY ?Long_name`;
}

export function rdfGraphsAndSpecFormats(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select (sample(?fmt) as ?format) ?graph where{
	graph ?graph {
		?dobj cpmeta:hasObjectSpec ?spec .
	}
	?spec cpmeta:hasFormat/rdfs:label ?fmt.
}
group by ?graph`;
}

export const listFilteredDataObjects = (config, options) => {

	function isEmpty(arr){return !arr || !arr.length;}

	const {specs, stations, submitters, sorting, paging, rdfGraphs, filters} = options;

	const fromClause = isEmpty(rdfGraphs) ? '' : 'FROM <' + rdfGraphs.join('>\nFROM <') + '>\n';

	const specsValues = isEmpty(specs)
		? `?${SPECCOL} a/rdfs:subClassOf? cpmeta:DataObjectSpec .`
		: (specs.length > 1)
			? `VALUES ?${SPECCOL} {<` + specs.join('> <') + '>}'
			: `BIND(<${specs[0]}> AS ?${SPECCOL})`;

	const submitterValues = isEmpty(submitters) ? ''
		: `VALUES ?submitter {<` + submitters.join('> <') + '>}\n';

	const dobjStation = '?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ';

	const noStationFilter = `FILTER NOT EXISTS{${dobjStation} []}`;

	function stationsFilter(stations){
		return stations.length == 1
			? dobjStation + `<${stations[0]}> .`
			: `VALUES ?station {<${stations.join('> <')}>}` +
				'\n' + dobjStation + '?station .';
	}

	const stationSearch = isEmpty(stations) ? '' : stations.some(s => !s)
		? stations.length === 1
			? noStationFilter
			: `{{
					${noStationFilter}
				} UNION {
					${stationsFilter(stations.filter(s => !!s))}
				}}`
		: stationsFilter(stations);

	const filterClauses = getFilterClauses(filters);

	const orderBy = (sorting && sorting.isEnabled && sorting.varName)
		? (
			sorting.ascending
				? `order by ?${sorting.varName}`
				: `order by desc(?${sorting.varName})`
			)
		: '';

	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix cpmetaObjectUri: <${config.cpmetaObjectUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?${SPECCOL} ?fileName ?size ?submTime ?timeStart ?timeEnd
${fromClause}where {
	${specsValues}
	FILTER(STRSTARTS(str(?${SPECCOL}), "${config.sparqlGraphFilter}"))
	FILTER NOT EXISTS {?${SPECCOL} cpmeta:hasDataLevel "1"^^xsd:integer} #temporary
	?dobj cpmeta:hasObjectSpec ?${SPECCOL} .
	${stationSearch}
	FILTER NOT EXISTS {[] cpmeta:isNextVersionOf ?dobj}
	?dobj cpmeta:hasSizeInBytes ?size .
	?dobj cpmeta:hasName ?fileName .
	${submitterValues}?dobj cpmeta:wasSubmittedBy [
		prov:endedAtTime ?submTime ;
		prov:wasAssociatedWith ?submitter
	] .
	?dobj cpmeta:hasStartTime | (cpmeta:wasAcquiredBy / prov:startedAtTime) ?timeStart .
	?dobj cpmeta:hasEndTime | (cpmeta:wasAcquiredBy / prov:endedAtTime) ?timeEnd .
	${filterClauses}
}
${orderBy}
offset ${paging.offset || 0} limit ${paging.limit || 20}`;
};

const getFilterClauses = filters => {
	const andFilters = filters.reduce((acc, f) => {
		if (f.fromDateTimeStr) {
			const cond = f.category === 'dataTime' ? '?timeStart' : '?submTime';
			acc.push(`${cond} >= '${f.fromDateTimeStr}'^^xsd:dateTime`);
		}
		if (f.toDateTimeStr) {
			const cond = f.category === 'dataTime' ? '?timeEnd' : '?submTime';
			acc.push(`${cond} <= '${f.toDateTimeStr}'^^xsd:dateTime`);
		}

		return acc;
	}, []).join(' && ');

	const orFilters = filters.reduce((acc, f) => {
		if (f.category === 'pids'){
			f.pids.forEach(fp => acc.push(`?dobj = cpmetaObjectUri:${fp}`));
		}

		return acc;
	}, []).join(' || ');

	let filterClauses = andFilters.length || orFilters.length
		? 'FILTER ('
		: '';
	if (filterClauses.length){
		if (andFilters.length && orFilters.length){
			filterClauses += `${andFilters} && (${orFilters}))`;
		} else if (andFilters.length){
			filterClauses += `${andFilters})`;
		}
		else if (orFilters.length){
			filterClauses += `${orFilters})`;
		}
	}

	return filterClauses;
};

export const extendedDataObjectInfo = (config, dobjs) => {
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?station ?theme ?themeIcon ?title ?description where{
	VALUES ?dobj { ${dobjs.join(' ')} }
	?dobj cpmeta:hasObjectSpec ?specUri .
	OPTIONAL{ ?specUri cpmeta:hasDataTheme [
		rdfs:label ?theme ;
		cpmeta:hasIcon ?themeIcon 
	]}
	OPTIONAL{?specUri rdfs:comment ?spec }
	OPTIONAL{ ?dobj <http://purl.org/dc/terms/title> ?title }
	OPTIONAL{ ?dobj <http://purl.org/dc/terms/description> ?description0 }
	OPTIONAL{ ?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith/cpmeta:hasName ?station }
	BIND ( IF(bound(?description0), ?description0, ?spec) AS ?description)
}`;
};
