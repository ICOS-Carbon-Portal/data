from .envri import CITIES_CONFIG
from .bootstrap import fromPasswordFile

auth, meta, data = fromPasswordFile(CITIES_CONFIG)
