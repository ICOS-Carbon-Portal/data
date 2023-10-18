from dataclasses import dataclass
from ..sparql import Binding, as_uri, as_string, as_opt_str, as_opt_double, as_opt_float
from ..envri import EnvriConfig
from ..metacore import UriResource

@dataclass(frozen=True)
class StationLite(UriResource):
	uri: str
	id: str
	type_uri: str
	name: str
	country_code: str
	lat: float | None
	lon: float | None
	elevation: float | None
	geo_json: str | None

def parse_station(row: Binding) -> StationLite:
	station_name = as_string("stationName", row)
	station_id = as_string("stId", row)

	return StationLite(
		uri = as_uri("station", row),
		id = station_id,
		type_uri = as_uri("stType", row),
		name = station_name,
		country_code = as_string("cCode", row),
		lat = as_opt_double("lat", row),
		lon = as_opt_double("lon", row),
		elevation = as_opt_float("elevation", row),
		geo_json = as_opt_str("geoJson", row),
		label = f"{station_name} ({station_id})",
		comments = [],
	)

def station_lite_list(station_type_uri: str | None, conf: EnvriConfig) -> str:
	top_station_class = '<' + station_type_uri + '>' if station_type_uri else 'cpmeta:Station'
	return f"""
		PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		PREFIX cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		SELECT * WHERE{{
			?stType rdfs:subClassOf* {top_station_class} . 
			?station a ?stType ; cpmeta:hasStationId ?stId ; cpmeta:hasName ?stationName ; cpmeta:countryCode ?cCode .
			FILTER(strstarts(str(?station), "{conf.meta_instance_prefix}"))
			OPTIONAL{{?station cpmeta:hasLatitude ?lat ; cpmeta:hasLongitude ?lon}}
			OPTIONAL{{?station cpmeta:hasElevation ?elevation}}
			OPTIONAL{{?station cpmeta:hasSpatialCoverage/cpmeta:asGeoJSON ?geoJson}}
		}}
		ORDER BY ?stId
		"""
