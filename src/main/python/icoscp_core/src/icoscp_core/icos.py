from .envri import ICOS_CONFIG
from .bootstrap import Bootstrap

bootstrap = Bootstrap(ICOS_CONFIG)
auth, meta, data = bootstrap.fromPasswordFile()
