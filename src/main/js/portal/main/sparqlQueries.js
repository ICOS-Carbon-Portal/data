export const SPECCOL = 'spec';

export function specBasics(config){
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?spec ?specLabel ?level ?format
where{
	?spec cpmeta:hasDataLevel ?level .
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
(sample(?submitterName) as ?submitter)
(if(bound(?stationName), ?stationName, "(not applicable)") as ?station)
(sample(?stationRes) as ?stationUri)
(count(?dobj) as ?count)
(if(sample(?submitterClass) = cpmeta:ThematicCenter, "ICOS", "Non-ICOS") as ?isIcos)
where{
	?dobj cpmeta:hasObjectSpec ?spec .
	?dobj cpmeta:wasSubmittedBy [
		prov:wasAssociatedWith ?submitterRes ;
		prov:endedAtTime []
	] .
	OPTIONAL{
		?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?stationRes .
		?stationRes cpmeta:hasName ?stationName
	}
	?submitterRes cpmeta:hasName ?submitterName .
	?submitterRes a ?submitterClass .
	FILTER(?submitterClass != owl:NamedIndividual)
}
group by ?spec ?submitterRes ?stationName`;
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
select ?graph (sample(?fmt) as ?format) where{
	?spec cpmeta:hasFormat [rdfs:label ?fmt] .
	graph ?graph {
	?dobj cpmeta:hasObjectSpec ?spec .
	}
}
group by ?graph`;
}

export const listFilteredDataObjects = (config, {specs, stations, sorting, paging}) => {

	const specsValues = (specs && specs.length)
		 ? `VALUES ?${SPECCOL} {<` + specs.join('> <') + '>}'
		 : '';

	const dobjStation = '?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .';
	const dobjSpec = `?dobj cpmeta:hasObjectSpec ?${SPECCOL} .`;
	const noStationFilter = dobjSpec + '\n' + `FILTER NOT EXISTS{${dobjStation}}`;

	function stationsFilter(stations){
		return `VALUES ?station {<${stations.join('> <')}>}` +
			'\n' + dobjSpec + '\n' + dobjStation;
	}

	const dobjSearch = (stations && stations.length)
		? stations.some(s => !s)
			? stations.length === 1
				? noStationFilter
				: `{{
						${noStationFilter}
					} UNION {
						${stationsFilter(stations.filter(s => !!s))}
					}}`
			: stationsFilter(stations)
		: dobjSpec;

	const orderBy = (sorting && sorting.isEnabled && sorting.varName)
		? (
			sorting.ascending
				? `order by ?${sorting.varName}`
				: `order by desc(?${sorting.varName})`
			)
		: '';

	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?fileName ?submTime ?acqStart ?acqEnd where {
	${specsValues}
	${dobjSearch}
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .
	OPTIONAL{
		?dobj cpmeta:wasAcquiredBy [
			prov:startedAtTime ?acqStart;
			prov:endedAtTime ?acqEnd
		]
	}
}
${orderBy}
offset ${paging.offset || 0} limit ${paging.limit || 20}`;
}

