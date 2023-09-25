from .envri import EnvriConfig
from .auth import ConfigFileAuth, PasswordAuth, TokenAuth
from .metaclient import MetadataClient
from .dataclient import DataClient
from typing import Tuple

class Bootstrap():
	def __init__(self, conf: EnvriConfig) -> None:
		self._conf = conf

	def fromPasswordFile(
		self, conf_file_path: str | None = None
	) -> Tuple[ConfigFileAuth, MetadataClient, DataClient]:
		auth = ConfigFileAuth(self._conf, conf_file_path)
		meta = MetadataClient(self._conf)
		data = DataClient(self._conf, auth)
		return auth, meta, data

	def fromCookieToken(self, token: str) -> Tuple[MetadataClient, DataClient]:
		auth = TokenAuth(token)
		meta = MetadataClient(self._conf)
		data = DataClient(self._conf, auth)
		return meta, data

	def fromCredentials(self, user_id: str, password: str) -> Tuple[MetadataClient, DataClient]:
		auth = PasswordAuth(user_id, password, self._conf)
		meta = MetadataClient(self._conf)
		data = DataClient(self._conf, auth)
		return meta, data
