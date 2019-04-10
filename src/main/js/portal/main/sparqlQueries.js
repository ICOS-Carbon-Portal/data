export const SPECCOL = 'spec';

export function specBasics(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?spec (?spec as ?type) ?specLabel ?level ?format ?formatLabel ?theme (if(bound(?theme), ?themeLbl, "(not applicable)") as ?themeLabel)
where{
	?spec cpmeta:hasDataLevel ?level .
	FILTER NOT EXISTS {?spec cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	OPTIONAL{
		?spec cpmeta:hasDataTheme ?theme .
		?theme rdfs:label ?themeLbl
	}
	FILTER EXISTS{[] cpmeta:hasObjectSpec ?spec}
	?spec rdfs:label ?specLabel .
	?spec cpmeta:hasFormat ?format .
	?format rdfs:label ?formatLabel .
}`;
}

export function specColumnMeta(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select distinct ?spec ?colTitle ?valType ?valTypeLabel ?quantityKind
(if(bound(?quantityKind), ?qKindLabel, "(not applicable)") as ?quantityKindLabel)
(if(bound(?unit), ?unit, "(not applicable)") as ?quantityUnit)
where{
	?spec cpmeta:containsDataset [cpmeta:hasColumn ?column ] .
	FILTER NOT EXISTS {?spec cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	FILTER EXISTS {[] cpmeta:hasObjectSpec ?spec}
	?column cpmeta:hasColumnTitle ?colTitle .
	?column cpmeta:hasValueType ?valType .
	?valType rdfs:label ?valTypeLabel .
	OPTIONAL{
		?valType cpmeta:hasQuantityKind ?quantityKind .
		?quantityKind rdfs:label ?qKindLabel .
	}
	OPTIONAL{?valType cpmeta:hasUnit ?unit }
}`;
}


export function dobjOriginsAndCounts(config){
	//This is needed to get rid of duplicates due to multiple labels for stations.
	//TODO Stop fetching labels in this query, use a dedicated label fetcher that prepares label lookup
	const fromClauses = config.envri == 'ICOS'
		? `from <http://meta.icos-cp.eu/resources/cpmeta/>
from <http://meta.icos-cp.eu/ontologies/cpmeta/>
from <http://meta.icos-cp.eu/resources/stations/>
from <http://meta.icos-cp.eu/resources/wdcgg/>`
		: '';

	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?spec ?submitter ?submitterLabel ?project ?projectLabel ?count
(if(bound(?stationName), ?station0, ?stationName) as ?station)
(if(bound(?stationName), CONCAT(?stPrefix, ?stationName), "(not applicable)") as ?stationLabel)
${fromClauses}
where{
	{
		select * where{
			[] cpmeta:hasStatProps [
				cpmeta:hasStatCount ?count;
				cpmeta:hasStatStation ?station0;
				cpmeta:hasStatSpec ?spec;
				cpmeta:hasStatSubmitter ?submitter
			] .
			OPTIONAL{?station0 cpmeta:hasName ?stationName}
			OPTIONAL{?station0 cpmeta:hasStationId ?stId}
		}
	}
	BIND( IF(bound(?stId), CONCAT("(", ?stId, ") "),"") AS ?stPrefix)
	FILTER(STRSTARTS(str(?spec), "${config.sparqlGraphFilter}"))
	?spec cpmeta:hasAssociatedProject ?project .
	FILTER NOT EXISTS {?project cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}
	?submitter cpmeta:hasName ?submitterLabel .
	?project rdfs:label ?projectLabel .
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

export const listFilteredDataObjects = (config, options) => {

	function isEmpty(arr){return !arr || !arr.length;}

	const {specs, stations, submitters, sorting, paging, rdfGraphs, filters} = options;

	const fromClause = isEmpty(rdfGraphs) ? '' : 'FROM <' + rdfGraphs.join('>\nFROM <') + '>\n';

	const specsValues = isEmpty(specs)
		? `?${SPECCOL} a/rdfs:subClassOf? cpmeta:DataObjectSpec .
			FILTER(STRSTARTS(str(?${SPECCOL}), "${config.sparqlGraphFilter}"))
			FILTER NOT EXISTS {?${SPECCOL} cpmeta:hasAssociatedProject/cpmeta:hasHideFromSearchPolicy "true"^^xsd:boolean}`
		: (specs.length > 1)
			? `VALUES ?${SPECCOL} {<` + specs.join('> <') + '>}'
			: `BIND(<${specs[0]}> AS ?${SPECCOL})`;

	const submitterValues = isEmpty(submitters) ? ''
		: `VALUES ?submitter {<` + submitters.join('> <') + '>}\n';

	const dobjStation = '?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ';

	const noStationFilter = `FILTER NOT EXISTS{${dobjStation} []}`;

	function stationsFilter(stations){
		return stations.length === 1
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

	const filterClauses = getFilterClauses(config, filters);

	const orderBy = (sorting && sorting.isEnabled && sorting.varName)
		? (
			sorting.ascending
				? `order by ?${sorting.varName}`
				: `order by desc(?${sorting.varName})`
			)
		: '';

	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?${SPECCOL} ?fileName ?size ?submTime ?timeStart ?timeEnd
${fromClause}where {
	${specsValues}
	?dobj cpmeta:hasObjectSpec ?${SPECCOL} .
	${stationSearch}
	FILTER NOT EXISTS {[] cpmeta:isNextVersionOf ?dobj}
	?dobj cpmeta:hasSizeInBytes ?size .
	?dobj cpmeta:hasName ?fileName .
	${submitterValues}?dobj cpmeta:wasSubmittedBy [
		prov:endedAtTime ?submTime ${isEmpty(submitters) ? '' : '; prov:wasAssociatedWith ?submitter'}
	] .
	?dobj cpmeta:hasStartTime | (cpmeta:wasAcquiredBy / prov:startedAtTime) ?timeStart .
	?dobj cpmeta:hasEndTime | (cpmeta:wasAcquiredBy / prov:endedAtTime) ?timeEnd .
	${filterClauses}
}
${orderBy}
offset ${paging.offset || 0} limit ${paging.limit || 20}`;
};

const getFilterClauses = (config, filters) => {
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
			// Do not use prefix since it cannot be used with pids starting with '-'
			f.pids.forEach(fp => acc.push(`?dobj = <${config.cpmetaObjectUri}${fp}>`));
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
	const dobjsList = dobjs.map(dobj => `<${dobj}>`).join(' ');
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select distinct ?dobj ?station ?stationId ?samplingHeight ?theme ?themeIcon ?title ?description ?columnNames where{
	{
		select ?dobj (min(?station0) as ?station) (sample(?stationId0) as ?stationId) (sample(?samplingHeight0) as ?samplingHeight) where{
			VALUES ?dobj { ${dobjsList} }
			OPTIONAL{
				?dobj cpmeta:wasAcquiredBy ?acq.
				?acq prov:wasAssociatedWith ?stationUri .
				OPTIONAL{ ?stationUri cpmeta:hasName ?station0 }
				OPTIONAL{ ?stationUri cpmeta:hasStationId ?stationId0 }
				OPTIONAL{ ?acq cpmeta:hasSamplingHeight ?samplingHeight0 }
			}
		}
		group by ?dobj
	}
	?dobj cpmeta:hasObjectSpec ?specUri .
	OPTIONAL{ ?specUri cpmeta:hasDataTheme [
		rdfs:label ?theme ;
		cpmeta:hasIcon ?themeIcon
	]}
	OPTIONAL{?specUri rdfs:comment ?spec }
	OPTIONAL{ ?dobj <http://purl.org/dc/terms/title> ?title }
	OPTIONAL{ ?dobj <http://purl.org/dc/terms/description> ?description0 }
	OPTIONAL{?dobj cpmeta:hasActualColumnNames ?columnNames }
	BIND ( IF(bound(?description0), ?description0, ?spec) AS ?description)
}`;
};
