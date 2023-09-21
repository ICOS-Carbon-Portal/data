from .envri import EnvriConfig
from .auth import ConfigFileAuth, PasswordAuth, TokenAuth
from .metaclient import MetadataClient
from .dataclient import DataClient
from typing import Tuple

def fromPasswordFile(
	conf: EnvriConfig, conf_file_path: str | None = None
) -> Tuple[ConfigFileAuth, MetadataClient, DataClient]:
	auth = ConfigFileAuth(conf, conf_file_path)
	meta = MetadataClient(conf)
	data = DataClient(conf, auth)
	return auth, meta, data

def fromCookieToken(token: str, conf: EnvriConfig) -> Tuple[MetadataClient, DataClient]:
	auth = TokenAuth(token)
	meta = MetadataClient(conf)
	data = DataClient(conf, auth)
	return meta, data

def fromCredentials(user_id: str, password: str, conf: EnvriConfig) -> Tuple[MetadataClient, DataClient]:
	auth = PasswordAuth(user_id, password, conf)
	meta = MetadataClient(conf)
	data = DataClient(conf, auth)
	return meta, data
