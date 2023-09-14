from envri import ICOS_CONFIG
from auth import ConfigFileAuth
from metaclient import MetadataClient
from dataclient import DataClient

from queries.dataobjlist import TimeFilter

auth = ConfigFileAuth(ICOS_CONFIG)

meta = MetadataClient(ICOS_CONFIG)

data = DataClient(ICOS_CONFIG, auth)

def example():
	objs = meta.list_data_objects(
		datatype = "http://meta.icos-cp.eu/resources/cpmeta/atcCo2Product",
		station = None,
		filters = [TimeFilter("submTime", ">", "2022-05-05T12:00:00Z")],
		includeDeprecated = False,
		orderBy = "size",
		limit = 100
	)
	for o in objs:
		print(o)
