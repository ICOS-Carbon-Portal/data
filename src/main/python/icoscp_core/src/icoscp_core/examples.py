from .icos import auth, meta, data
from .metaclient import TimeFilter, SizeFilter
import pandas as pd
from typing import Any

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

def test_bin_fetch(cols: list[str] | None = None, offset: int | None = None, length: int | None = None) -> pd.DataFrame:
	uri = 'https://meta.icos-cp.eu/objects/Vc1PlzeIRsIwVddwPHDDeCiN'
	dobj = meta.get_dobj_meta(uri)
	raw = data.get_columns_as_arrays(dobj, cols, offset, length)
	df = pd.DataFrame(raw)
	print(df.head())
	return df

def test_csv_fetch() -> pd.DataFrame:
	uri = 'https://meta.icos-cp.eu/objects/Vc1PlzeIRsIwVddwPHDDeCiN'
	csv_stream: Any = data.get_csv_byte_stream(uri)
	df = pd.read_csv(filepath_or_buffer=csv_stream)
	print(df.head())
	return df