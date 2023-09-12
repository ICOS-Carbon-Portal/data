from envri import SITES_CONFIG
from auth import ConfigFileAuth
from metaclient import MetadataClient
from dataclient import DataClient

auth = ConfigFileAuth(SITES_CONFIG)

meta = MetadataClient(SITES_CONFIG)

data = DataClient(SITES_CONFIG, auth)
