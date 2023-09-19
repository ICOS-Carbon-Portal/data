import os
import re
import requests
import io
import shutil
from urllib.parse import urlsplit, unquote
from typing import Optional, Iterator
from .queries.dataobjlist import DataObjectLite
from .envri import EnvriConfig
from .auth import AuthTokenProvider
from typing import Tuple


class DataClient:
	def __init__(self, conf: EnvriConfig, auth: AuthTokenProvider) -> None:
		self._conf = conf
		self._auth = auth

	def get_file_stream(self, dobj_uri: str) -> Tuple[str, io.BufferedReader]:
		path = urlsplit(dobj_uri).path
		url = self._conf.data_service_base_url + path
		resp = requests.get(url = url, headers = {"Cookie": self._auth.get_token().cookie_value}, stream=True)
		if resp.status_code != 200:
			raise Exception(f"Failed fetching data object from {url}, got response: {resp.text}")
		disp_head = resp.headers["Content-Disposition"]
		fn_match = re.search(r'filename="(.*)"', disp_head)
		if not fn_match:
			raise Exception(f"No filename information in response from {url}, cannot save to folder")
		filename = unquote(fn_match.group(1))

		chunk_size = io.DEFAULT_BUFFER_SIZE
		resp_buffer = io.BufferedReader(HttpResponseStream(resp, chunk_size), chunk_size)

		return filename, resp_buffer

	def save_to_folder(self, dobj_uri: str, folder_path: str) -> str:
		"""
		Downloads the original verbatim content of a data- or document object,
		and saves it to a folder in a file named according to object's metadata.
		If the file already exists, it gets overwritten.

		:param dobj_uri: the landing page URI of the object
		:param folder_path: path to the target folder

		:returns: the name of the file used to save the object
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
		limit: Optional[int] = None,
		offset: Optional[int] = None
	) -> io.BufferedReader:
		dobj_uri: str
		if type(dobj) == DataObjectLite: dobj_uri = dobj.uri
		elif type(dobj) == str: dobj_uri = dobj
		else: raise ValueError('dobj_uri must be a string or a DataObjectLite instance')
		dobj_hash = dobj_uri.split('/')[-1]

		params = {
			"col": cols,
			"offset": offset,
			"limit": limit
		}

		url = self._conf.data_service_base_url + "/csv/" + dobj_hash
		resp = requests.get(url = url, headers = {"Cookie": self._auth.get_token().cookie_value}, stream=True, params=params)
		
		if resp.status_code != 200:
			raise Exception(f"Failed fetching data object from {url}, got response {resp.text}")

		chunk_size = io.DEFAULT_BUFFER_SIZE
		return io.BufferedReader(HttpResponseStream(resp, chunk_size), chunk_size)

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
