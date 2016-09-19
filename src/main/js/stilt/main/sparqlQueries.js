/*

import config from './config';

var {wdcggBaseUri, cpmetaOntoUri} = config;

export function stationPositions(){
	return `prefix cpmeta: <${cpmetaOntoUri}>
select *
from <${wdcggBaseUri}>
where{
	?station a cpmeta:Station .
	?station cpmeta:hasName ?name .
	?station cpmeta:hasLatitude ?lat .
	?station cpmeta:hasLongitude ?lon .
}`;
}

*/

prefix st: <http://meta.icos-cp.eu/ontologies/stationentry/>
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select distinct ?stiltId ?stationName ?lat ?lon ?dobj ?ackStartTime ?ackEndTime ?nRows
FROM NAMED <http://meta.icos-cp.eu/resources/wdcgg/>
FROM NAMED <http://meta.icos-cp.eu/resources/stationentry/>
where {
	VALUES (?stiltId ?shortName ?wdcggName ?stiltLat ?stiltLon) {
		("BAL" "" "Baltic Sea " "" "")
		("JFJ" "JFJ" "Jungfraujoch " "" "")
		("CB1" "NL-Cab" "" "" "")
	}
	OPTIONAL{ GRAPH <http://meta.icos-cp.eu/resources/stationentry/> {
		?icosStation st:hasShortName ?shortName ;
			st:hasLongName ?icosName ;
			st:hasLat ?icosLat ;
			st:hasLon ?icosLon .
	}}
	OPTIONAL{ GRAPH <http://meta.icos-cp.eu/resources/wdcgg/> {
		?wdcggStation cpmeta:hasName ?wdcggName ;
			cpmeta:hasLatitude ?wdcggLat ;
			cpmeta:hasLongitude ?wdcggLon .
		?acquisition prov:wasAssociatedWith ?wdcggStation .
		?dobj cpmeta:wasAcquiredBy ?acquisition ;
			<http://meta.icos-cp.eu/resources/wdcgg/PARAMETER> "CO2"^^xsd:string ;
			<http://meta.icos-cp.eu/resources/wdcgg/TIME%20INTERVAL> "hourly"^^xsd:string ;
			cpmeta:hasNumberOfRows ?nRows .
		?acquisition prov:endedAtTime ?ackEndTime ;
			prov:startedAtTime ?ackStartTime .
	}}
	BIND(IF(BOUND(?icosName), ?icosName, IF(BOUND(?wdcggName), ?wdcggName, ?stiltId)) as ?stationName)
	BIND(IF(BOUND(?icosLat), ?icosLat, IF(BOUND(?wdcggLat), ?wdcggLat, ?stiltLat)) as ?lat)
	BIND(IF(BOUND(?icosLon), ?icosLon, IF(BOUND(?wdcggLon), ?wdcggLon, ?stiltLon)) as ?lon)
}

