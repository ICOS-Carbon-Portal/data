from .envri import ICOS_CONFIG
from .auth import ConfigFileAuth
from .metaclient import MetadataClient
from .dataclient import DataClient

from .queries.dataobjlist import TimeFilter, SizeFilter

auth = ConfigFileAuth(ICOS_CONFIG)

meta = MetadataClient(ICOS_CONFIG)

data = DataClient(ICOS_CONFIG, auth)

def example():
	objs = meta.list_data_objects(
		datatype = "http://meta.icos-cp.eu/resources/cpmeta/atcCo2Product",
		station = None,
		filters = [TimeFilter("submTime", ">", "2022-05-05T12:00:00Z"), SizeFilter(">", 100000)],
		includeDeprecated = False,
		orderBy = "size",
		limit = 100
	)
	for o in objs:
		print(o.filename)

def example2():
	stations = meta.list_stations(of_station_type_uri=False)
	for s in stations:
		print(s.name)
