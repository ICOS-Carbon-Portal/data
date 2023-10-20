import os
import re
import requests
import io
import shutil
from urllib.parse import urlsplit, unquote
#import time as tm
from typing import Iterator, Tuple, Any

from icoscp_core.metaclient import MetadataClient
from .metacore import DataObject
from .queries.dataobjlist import DataObjectLite
from .envri import EnvriConfig
from .auth import AuthTokenProvider
from .cpb import Codec, TableRequest, ArraysDict, codec_from_dobj_meta, codecs_from_dobjs
from .cpb import Dobj, dobj_uri
from .portaluse_client import report_cpb_file_read


class DataClient:
	def __init__(
		self,
		conf: EnvriConfig,
		auth: AuthTokenProvider,
		data_folder_path: str | None
	) -> None:
		self._conf = conf
		self._auth = auth
		self._meta = MetadataClient(conf)
		self._data_folder_path = data_folder_path

	@property
	def meta(self) -> MetadataClient:
		return self._meta

	def get_file_stream(self, dobj: str | DataObjectLite) -> Tuple[str, io.BufferedReader]:
		"""
		Fetches the original verbatim content of a data- or document object. The method is HTTP-backed and always requires authentication.

		:param dobj:
			the landing page URI of the object, or a DataObjectLite instance
		:returns:
			a tuple of object filename and a file-like object (io.BufferedReader) with contents,
			which can be either saved to disk or directly sent for processing
		"""

		dobj_uri = to_dobj_uri(dobj)
		url = self._conf.data_service_base_url + urlsplit(dobj_uri).path
		resp = self._auth_get(url, 'fetching data object')

		filename: str
		if type(dobj) is DataObjectLite:
			filename = dobj.filename
		else:
			disp_head = resp.headers["Content-Disposition"]
			fn_match = re.search(r'filename="(.*)"', disp_head)
			if not fn_match:
				raise Exception(f"No filename information in response from {url}")
			filename = unquote(fn_match.group(1))

		return filename, response_as_reader(resp)

	def save_to_folder(self, dobj_uri: str | DataObjectLite, folder_path: str) -> str:
		"""
		Downloads the original verbatim content of a data- or document object,
		and saves it to a folder in a file named according to object's metadata.
		If the file already exists, it gets overwritten.

		Requires authentication for data object downloads, even on a Jupyter notebook with data storage folder access.

		:param dobj_uri:
			the landing page URI of the object, or a DataObjectLite instance
		:param folder_path:
			path to the target folder

		:returns:
			the name of the file used to save the object
		"""

		filename, resp_buffer = self.get_file_stream(dobj_uri)

		save_path = os.path.join(folder_path, filename)
		with resp_buffer as reader:
			with open(save_path, "wb") as writer:
				shutil.copyfileobj(reader, writer)
				return filename


	def get_csv_byte_stream(
		self,
		dobj: str | DataObjectLite,
		cols: list[str] = [],
		limit: int | None = None,
		offset: int | None = None
	) -> io.BufferedReader:
		"""
		Fetches a standardized plain CSV serialization of a tabular data object (that has columnar metadata and has been ingested by the data portal).

		This method always requires authentication, even if used from a Jupyter notebook with access to the data storage folder.

		:param dobj:
			the landing page URI of the data object, or a DataObjectLite instance
		:param cols:
			list of columns to be included; if omitted, all known columns will be returned
		:param limit:
			limits the number of table rows to be returned
		:param offset:
			number of rows to skip

		:return:
			io.BufferedReader with a stream of CSV bytes. Can be readily parsed with `pandas.read_csv`
		"""

		dobj_hash = to_dobj_uri(dobj).split('/')[-1]

		resp = self._auth_get(
			url = self._conf.data_service_base_url + "/csv/" + dobj_hash,
			error_hint = 'fetching CSV',
			params = {
				"col": cols,
				"offset": offset,
				"limit": limit
			}
		)

		return response_as_reader(resp)


	def get_columns_as_arrays(
		self,
		dobj: DataObject,
		columns: list[str] | None = None,
		keep_bad_data: bool = False,
		offset: int | None = None,
		length: int | None = None
	) -> ArraysDict:
		"""
		Fetches a binary tabular data object and returns it as a dictionary of numpy arrays.

		:param dobj:
			a DataObject instance with detailed data object metadata (obtainable from `MetaClient`'s method `get_dobj_meta`)
		:param cols:
			list of columns to be included; if None, all known columns will be returned; if the requested columns have accompanying quality flag columns, the latter will be automatically included.
		:param keep_bad_data:
			flag to force including numeric values that have been flagged as not good in corresponding quality flag columns; by default these values are set to NaN
		:param offset:
			number of heading rows to skip; if None, does not skip any row
		:param length:
			number of rows to return; if None, return all rows

		:return:
			a dictionary mapping column names to numpy arrays. The dictionary can be readily sent to `pandas.DataFrame` constructor.
		"""

		req = TableRequest(desired_columns=columns, offset=offset, length=length)
		codec = codec_from_dobj_meta(dobj, req)
		res = self._get_columns_as_arrays(codec, keep_bad_data)

		if self._data_folder_path is not None:
			report_cpb_file_read(self._conf, hashes = [dobj.hash[:24]], columns=columns)

		return res


	def batch_get_columns_as_arrays(
		self,
		dobjs: list[Dobj],
		columns: list[str] | None = None,
		keep_bad_data: bool = False
	) -> Iterator[Tuple[Dobj, ArraysDict]]:
		"""
		Efficient batch-fetching version of `get_columns_as_arrays` method. Can only be used with groups of data objects of the same data type, or whose data types share a dataset specification.

		:param dobjs:
			either a list of data object landing page URIs, or a list of `DataObjectLite` instances (obtainable from `MetaClient`'s method `list_data_objects`)

		:param columns:
			a list of names of columns to be fetched, or `None` for all preview-available columns in the data objects. If the requested columns have accompanying quality flag columns, the latter will be automatically included.

		:param keep_bad_data:
			flag to force including numeric values that have been flagged as not good in corresponding quality flag columns; by default these values are set to NaN

		:return:
			a lazy iterable of pairs of the data objects (echoed back from the `dobjs` input) and a dictionary mapping column names to numpy arrays.
		"""
		req = TableRequest(columns, None, None)
		dobj_codecs = codecs_from_dobjs(dobjs, req, self._meta)

		if self._data_folder_path is not None:
			hashes = [dobj_uri(dobj).split('/')[-1] for dobj, _ in dobj_codecs]
			report_cpb_file_read(self._conf, hashes=hashes, columns=columns)

		for dobj, codec in dobj_codecs:
			yield dobj, self._get_columns_as_arrays(codec, keep_bad_data)


	def _get_columns_as_arrays(self, codec: Codec, keep_bad_data: bool) -> ArraysDict:
		if self._data_folder_path is not None:
			return codec.parse_cpb_file(self._data_folder_path, keep_bad_data)
		#start_time = tm.time()
		headers = {"Accept": "application/octet-stream", "Content-Type": "application/json"}
		url = self._conf.data_service_base_url + '/cpb'
		resp = self._auth_post(url, "fetching binary", headers, codec.json_payload)
		reader = response_as_reader(resp)
		#parse_time = tm.time()
		#print(f'Response from cpb service for {codec._ci.dobj_hash} in {(parse_time - start_time) * 1000} ms')
		res = codec.parse_cpb_response(reader, keep_bad_data)
		#print(f'Parsed binary for {codec._ci.dobj_hash} in {(tm.time() - parse_time) * 1000} ms')
		return res


	def _auth_get(self, url: str, error_hint: str, params: dict[str, Any] | None = None) -> requests.Response:
		headers = {"Cookie": self._auth.get_token().cookie_value}
		resp = requests.get(url=url, headers=headers, stream=True, params=params)
		if resp.status_code != 200:
			raise Exception(f"Failed {error_hint} from {url}, got response {resp.text}")
		return resp


	def _auth_post(
		self,
		url: str,
		error_hint: str,
		headers: dict[str, Any] | None = None,
		json: dict[str, Any] | None = None
	) -> requests.Response:
		if headers:
			headers["Cookie"] = self._auth.get_token().cookie_value
		else:
			headers = {"Cookie": self._auth.get_token().cookie_value}
		resp = requests.post(url=url, headers=headers, stream=True, json=json)
		if resp.status_code != 200:
			raise Exception(f"Failed {error_hint} from {url}, got response {resp.text}")
		return resp


class HttpResponseStream(io.RawIOBase):
	def __init__(self, resp: requests.Response, chunk_size: int):
		self._http_resp = resp
		self._chunk_size = chunk_size
		self._iterable: Iterator[bytes] = resp.iter_content(chunk_size = chunk_size)
		self.leftover: bytes | None = None
	def readable(self):
		return True
	def readinto(self, b: Any):
		try:
			l = len(b)
			chunk = self.leftover or next(self._iterable)
			output, self.leftover = chunk[:l], chunk[l:]
			b[:len(output)] = output
			return len(output)
		except StopIteration:
			return 0
	def close(self) -> None:
		self._http_resp.close()
		return super().close()

def to_dobj_uri(dobj: str | DataObjectLite) -> str:
	if type(dobj) == DataObjectLite: return dobj.uri
	elif type(dobj) == str: return dobj
	else: raise ValueError('dobj_uri must be a string or a DataObjectLite instance')

def response_as_reader(resp: requests.Response) -> io.BufferedReader:
	chunk_size = io.DEFAULT_BUFFER_SIZE
	return io.BufferedReader(HttpResponseStream(resp, chunk_size), chunk_size)

