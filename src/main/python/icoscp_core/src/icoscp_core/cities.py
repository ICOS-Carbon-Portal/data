from .envri import CITIES_CONFIG
from .auth import ConfigFileAuth
from .metaclient import MetadataClient
from .dataclient import DataClient

auth = ConfigFileAuth(CITIES_CONFIG)

meta = MetadataClient(CITIES_CONFIG)

data = DataClient(CITIES_CONFIG, auth)
