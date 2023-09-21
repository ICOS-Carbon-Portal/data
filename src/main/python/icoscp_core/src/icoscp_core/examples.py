from .icos import auth, meta
from .metaclient import TimeFilter, SizeFilter

def init_authentication() -> None:
	return auth.init_config_file()

def list_filtered_atc_co2():
	return meta.list_data_objects(
		datatype = "http://meta.icos-cp.eu/resources/cpmeta/atcCo2Product",
		filters = [TimeFilter("submTime", ">", "2022-05-05T12:00:00Z"), SizeFilter(">", 100000)],
		include_deprecated = False,
		order_by = "size",
		limit = 100
	)

def list_all_stations_in_icos_cp():
	return meta.list_stations(of_station_type_uri=False)
