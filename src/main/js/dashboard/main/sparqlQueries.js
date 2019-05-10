export const listStationMeasurement = (config, stationId, valueType) => {
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
prefix prov: <http://www.w3.org/ns/prov#>
select ?dobj ?spec ?valType ?height ?instrument where{
    ?station cpmeta:hasStationId "${stationId}"^^xsd:string .
    ?column cpmeta:hasColumnTitle "${valueType}"^^xsd:string ;
        cpmeta:hasValueType [rdfs:label ?valType ] .
    ?spec cpmeta:containsDataset/cpmeta:hasColumn ?column ;
        cpmeta:hasDataLevel "1"^^xsd:integer ;
        cpmeta:hasAssociatedProject <http://meta.icos-cp.eu/resources/projects/icos> .
    ?dobj cpmeta:hasObjectSpec ?spec .
    ?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station .
    filter not exists {[] cpmeta:isNextVersionOf ?dobj}
    ?dobj cpmeta:wasAcquiredBy [
        cpmeta:hasSamplingHeight ?height ;
        cpmeta:wasPerformedWith ?instrument
    ] .
}`;
};
