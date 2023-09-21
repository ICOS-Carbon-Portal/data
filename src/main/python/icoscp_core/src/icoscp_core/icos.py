from .envri import ICOS_CONFIG
from .bootstrap import fromPasswordFile

auth, meta, data = fromPasswordFile(ICOS_CONFIG)
