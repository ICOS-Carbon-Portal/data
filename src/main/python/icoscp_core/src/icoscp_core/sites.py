from .envri import SITES_CONFIG
from .bootstrap import fromPasswordFile

auth, meta, data = fromPasswordFile(SITES_CONFIG)
