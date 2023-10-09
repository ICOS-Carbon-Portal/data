from .icos import auth, meta, data
from .sites import meta as smeta, data as sdata
from .metaclient import TimeFilter, SizeFilter
import pandas as pd
import time as tm
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

def test_big_bin():
	uri = 'https://meta.icos-cp.eu/objects/4F2-9d7QV9A0SlL2pIaRxsJP'
	start_time = tm.time()
	dobj_meta = meta.get_dobj_meta(uri)
	print(f'Fetched detailed meta in {(tm.time() - start_time) * 1000} ms')
	start_time = tm.time()
	arrs = data.get_columns_as_arrays(dobj_meta)#, ["TIMESTAMP", "TA_F", "TA_F_QC"], length=5)
	print(f'Fetched cols as arrays in {(tm.time() - start_time) * 1000} ms')
	start_time = tm.time()
	df = pd.DataFrame(arrs)
	print(f'Initialized DataFrame in {(tm.time() - start_time) * 1000} ms')
	#print(df.dtypes)
	return df

def test_dtypes():
	uri = 'https://meta.icos-cp.eu/objects/l1akCR-3LKhmo3TiMA2B65ju'
	dobj_meta = meta.get_dobj_meta(uri)
	arrs = data.get_columns_as_arrays(dobj_meta)
	df = pd.DataFrame(arrs)
	print(df)
	return df

def test_year_month_col():
	uri = 'https://meta.fieldsites.se/objects/8X4qp6xZTz-6m0cN3WBxq81O'
	dobj_meta = smeta.get_dobj_meta(uri)
	df = pd.DataFrame(sdata.get_columns_as_arrays(dobj_meta))
	print(df)
	return df