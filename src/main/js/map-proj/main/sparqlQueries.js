
export const getStations = config =>{
	return `prefix cpst: <${config.cpmetaOntoStationEntryUri}>
SELECT
    (str(?s) AS ?id)
    (IF(bound(?latitude), ?latitude, "?") AS ?lat)
    (IF(bound(?longitude), ?longitude, "?") AS ?lon)
    (IF(bound(?spatRef), str(?spatRef), "?") AS ?geoJson)
    (REPLACE(str(?class),"${config.cpmetaOntoStationEntryUri}", "") AS ?themeShort)
    (IF(bound(?country), str(?country), "?") AS ?Country)
    (str(?sName) AS ?Short_name)
    (str(?lName) AS ?Long_name)
    (GROUP_CONCAT(?piLname; separator=";") AS ?PI_names)
    (IF(bound(?siteType), str(?siteType), "?") AS ?Site_type)
FROM <${config.cpmetaResStationEntryUri}>
WHERE {?s a ?class .
	OPTIONAL{?s cpst:hasLat ?latitude . ?s cpst:hasLon ?longitude } .
	OPTIONAL{?s cpst:hasSpatialReference ?spatRef } .
	OPTIONAL{?s cpst:hasCountry ?country } .
	?s cpst:hasShortName ?sName .
	?s cpst:hasLongName ?lName .
	?s cpst:hasPi ?pi .
	OPTIONAL{?pi cpst:hasFirstName ?piFname } .
	?pi cpst:hasLastName ?piLname .
	OPTIONAL{?s cpst:hasSiteType ?siteType } .
}
GROUP BY ?s ?latitude ?longitude ?spatRef ?locationDesc ?class ?country ?sName ?lName ?siteType ?elevationAboveSea
?elevationAboveGround ?stationClass ?stationKind ?preIcosMeasurements ?operationalDateEstimate ?isOperational ?fundingForConstruction`;
};
