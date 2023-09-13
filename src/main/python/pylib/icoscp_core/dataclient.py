import os
import re
import requests
from urllib.parse import urlsplit, unquote

from envri import EnvriConfig
from auth import AuthTokenProvider


class DataClient:
	def __init__(self, conf: EnvriConfig, auth: AuthTokenProvider) -> None:
		self._conf = conf
		self._auth = auth

	def save_to_folder(self, dobj_uri: str, folder_path: str) -> str:
		"""
		Downloads the original verbatim content of a data- or document object,
		and saves it to a folder in a file named according to object's metadata.
		If the file already exists, it gets overwritten.

		:param dobj_uri: the landing page URI of the object
		:param folder_path: path to the target folder

		:returns: the name of the file used to save the object
		"""
		path = urlsplit(dobj_uri).path
		url = self._conf.data_service_base_url + path
		resp = requests.get(url = url, headers = {"Cookie": self._auth.get_token().cookie_value})
		if resp.status_code != 200:
			raise Exception(f"Failed fetching data object from {url}, got response: {resp.text}")
		disp_head = resp.headers["Content-Disposition"]
		fn_match = re.search(r'filename="(.*)"', disp_head)
		if not fn_match:
			raise Exception(f"No filename information in response from {url}, cannot save to folder")
		filename = unquote(fn_match.group(1))
		save_path = os.path.join(folder_path, filename)
		with open(save_path, "wb") as save_file:
			save_file.write(resp.content)
			return filename
