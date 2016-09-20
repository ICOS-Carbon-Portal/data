import config from './config';

const stationValues = config.stations.map(
	([stiltId, stiltLat, stiltLon, icosId, wdcggName]) =>
	//TODO Remove the extra trailing space at the end of wdcggName when it is removed from the metadata
		`("${stiltId}" "${stiltLat}"^^xsd:double "${stiltLon}"^^xsd:double "${icosId}" "${wdcggName} ")`
).join('\n');

export const stationInfoQuery = `prefix st: <http://meta.icos-cp.eu/ontologies/stationentry/>
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
select distinct ?stiltId ?stationName ?lat ?lon ?dobj ?nRows ?ackStartTime ?ackEndTime
FROM NAMED <http://meta.icos-cp.eu/resources/wdcgg/>
FROM NAMED <http://meta.icos-cp.eu/resources/stationentry/>
where {
	VALUES (?stiltId ?stiltLat ?stiltLon ?icosId ?wdcggId) {
		${stationValues}
	}
	OPTIONAL{ GRAPH <http://meta.icos-cp.eu/resources/stationentry/> {
		?icosStation st:hasShortName ?icosId ;
			st:hasLongName ?icosName ;
			st:hasLat ?icosLat ;
			st:hasLon ?icosLon .
	}}
	OPTIONAL{ GRAPH <http://meta.icos-cp.eu/resources/wdcgg/> {
		?wdcggStation cpmeta:hasName ?wdcggId ;
			cpmeta:hasName ?wdcggName ;
			cpmeta:hasLatitude ?wdcggLat ;
			cpmeta:hasLongitude ?wdcggLon .
		OPTIONAL{
			?acquisition prov:wasAssociatedWith ?wdcggStation .
			?dobj cpmeta:wasAcquiredBy ?acquisition ;
				<http://meta.icos-cp.eu/resources/wdcgg/PARAMETER> "CO2"^^xsd:string ;
				<http://meta.icos-cp.eu/resources/wdcgg/TIME%20INTERVAL> "hourly"^^xsd:string ;
				cpmeta:hasNumberOfRows ?nRows .
			?acquisition prov:endedAtTime ?ackEndTime ;
				prov:startedAtTime ?ackStartTime .
		}
	}}
	BIND(IF(BOUND(?icosName), ?icosName, IF(BOUND(?wdcggName), ?wdcggName, ?stiltId)) as ?stationName)
	BIND(IF(BOUND(?icosLat), ?icosLat, IF(BOUND(?wdcggLat), ?wdcggLat, ?stiltLat)) as ?lat)
	BIND(IF(BOUND(?icosLon), ?icosLon, IF(BOUND(?wdcggLon), ?wdcggLon, ?stiltLon)) as ?lon)
}`;

