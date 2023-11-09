from .cpb import ArraysDict
from .envri import ICOS_CONFIG
from .bootstrap import Bootstrap
from .icos import auth, meta, data
from .sites import auth as sauth, meta as smeta, data as sdata
from .metaclient import Station, TimeFilter, SizeFilter, MetadataClient
from .dataclient import DataClient
import os
import pandas as pd
import time as tm
from typing import Any

def init_authentication_icos() -> None:
	return auth.init_config_file()

def init_authentication_sites() -> None:
	return sauth.init_config_file()

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

def get_station_meta() -> Station:
	return meta.get_station_meta('http://meta.icos-cp.eu/resources/stations/ES_DE-HoH')

def test_bin_fetch(cols: list[str] | None = None, offset: int | None = None, length: int | None = None) -> pd.DataFrame:
	uri = 'https://meta.icos-cp.eu/objects/Vc1PlzeIRsIwVddwPHDDeCiN'
	dobj = meta.get_dobj_meta(uri)
	raw = data.get_columns_as_arrays(dobj, columns=cols, offset=offset, length=length)
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
	return _test_big_bin(meta, data)

def _test_big_bin(meta: MetadataClient, data: DataClient):
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

def test_local_access():
	#os.environ["PORTAL_DATA_PATH_ICOS"] = '/home/oleg/workspace/data/fileStorage/'
	os.environ["PORTAL_DATA_PATH_ICOS"] = '/home/jonathan-schenk/Documents/icos-cp/fileStorage/'
	boot = Bootstrap(ICOS_CONFIG)
	_, meta, data = boot.fromPasswordFile()
	return _test_big_bin(meta, data)

def test_flag_col_injection(batch_mode: bool) -> ArraysDict:
	dobj = 'https://meta.icos-cp.eu/objects/Vc1PlzeIRsIwVddwPHDDeCiN'
	cols = ['co2', 'TIMESTAMP']
	if batch_mode:
		return [arrs for _, arrs in data.batch_get_columns_as_arrays([dobj], cols)][0]
	else:
		dobj_meta = meta.get_dobj_meta(dobj)
		return data.get_columns_as_arrays(dobj_meta, cols)

def test_bad_value_reset(keep_bad: bool) -> ArraysDict:
	dobj = 'https://meta.icos-cp.eu/objects/vTB9m0Wdb8b18cqGD9OeEhOq'
	dobj_meta = meta.get_dobj_meta(dobj)
	return data.get_columns_as_arrays(dobj_meta, columns=['GPP_DT_VUT_REF'], keep_bad_data=keep_bad)
