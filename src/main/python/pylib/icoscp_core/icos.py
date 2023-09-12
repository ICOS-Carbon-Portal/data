from envri import ICOS_CONFIG
from auth import ConfigFileAuth
from metaclient import MetadataClient
from dataclient import DataClient

auth = ConfigFileAuth(ICOS_CONFIG)

meta = MetadataClient(ICOS_CONFIG)

data = DataClient(ICOS_CONFIG, auth)
