import os
import re
import requests
import io
import shutil
import struct
from array import array
from urllib.parse import urlsplit, unquote
from typing import Iterator
from .metacore import DataObject
from .queries.dataobjlist import DataObjectLite
from .envri import EnvriConfig
from .auth import AuthTokenProvider
from .cpb import SingleObjectCodec
from typing import Tuple, Any


class DataClient:
	def __init__(self, conf: EnvriConfig, auth: AuthTokenProvider) -> None:
		self._conf = conf
		self._auth = auth

	def get_file_stream(self, dobj: str | DataObjectLite) -> Tuple[str, io.BufferedReader]:
		"""
		Fetches the original verbatim content of a data- or document object.

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

		:param dobj:
			the landing page URI of the data object, or a DataObjectLite instance
		:param cols:
			list of columns to be included; if omitted, all known columns will be returned
		:param limit:
			limits the number of table rows to be returned
		:param offset:
			number of rows to skip
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


	def get_cpb_as_dict(
		self,
		dobj: str | DataObjectLite | DataObject,
		cols: list[str] = [],
		offset: int | None = None,
		length: int | None = None
	) -> dict[str, Any]:
		"""
		Fetches a binary tabular data object and returns it as a dictionary of typed arrays.

		:param dobj:
			the landing page URI of the data object, a DataObjectLite instance or a DataObject instance
		:param cols:
			list of columns to be included; if omitted, all known columns will be returned
		:param offset:
			number of heading rows to skip; if omitted, does not skip any row
		:param length:
			number of rows to return; if omitted, return all rows
		"""

		headers = {"Accept": "application/octet-stream", "Content-Type": "application/json"}
		dobj_codec = SingleObjectCodec(self._conf, dobj)
		json = dobj_codec.json_payload(cols, offset, length)
		resp = self._auth_post(self._conf.data_service_base_url + '/cpb', "fetching binary", headers, json)
		if len(cols) == 0: cols = dobj_codec.get_labels_meta_columns()
		byte_size_cols = dobj_codec.get_info_columns(get_byte_size, cols)
		format_char_cols = dobj_codec.get_info_columns(get_format_char, cols)
		if length is None:
			n_rows = json["schema"]["size"]
			if offset is not None:
				n_rows -= offset
		else:
			n_rows = length
		return response_as_dict(resp, cols, byte_size_cols, format_char_cols, n_rows)


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
	def readinto(self, b):
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

def response_as_dict(
	resp: requests.Response,
	cols: list[str],
	byte_size_cols: list[int],
	format_char_cols: list[str],
	n_rows: int
) -> dict[str, Any]:
	data = response_as_reader(resp).read()
	res: dict[str, array[Any]] = {col: array(format_char_cols[n]) for n, col in enumerate(cols)}
	ind = 0
	for n in range(len(cols)):
		fmt = f">{n_rows}{format_char_cols[n]}"
		col_length = n_rows*byte_size_cols[n]
		res[cols[n]].extend(struct.unpack(fmt, data[ind:(ind+col_length)]))
		ind += col_length
	return res

def get_byte_size(fmt: str) -> int:
	byte_size = {
		'INT': 4,
		'FLOAT': 4,
		'DOUBLE': 8,
		'SHORT': 2,
		'CHAR': 2,
		'BYTE': 1,
		'STRING': 4
	}
	return byte_size[fmt]

def get_format_char(fmt: str) -> str:
	fmt_char = {
		'INT': 'l',
		'FLOAT': 'f',
		'DOUBLE': 'd',
		'SHORT': 'h',
		'CHAR': 'u',
		'BYTE': 'b',
	}
	return fmt_char[fmt]