from .envri import ICOS_CONFIG
from .bootstrap import Bootstrap

bootstrap = Bootstrap(ICOS_CONFIG)
auth, meta, data = bootstrap.fromPasswordFile()


ATMO_STATION = "http://meta.icos-cp.eu/ontologies/cpmeta/AS"
ECO_STATION = "http://meta.icos-cp.eu/ontologies/cpmeta/ES"
OCEAN_STATION = "http://meta.icos-cp.eu/ontologies/cpmeta/OS"