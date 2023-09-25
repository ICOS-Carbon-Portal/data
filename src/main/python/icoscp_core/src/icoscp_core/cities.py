from .envri import CITIES_CONFIG
from .bootstrap import Bootstrap

bootstrap = Bootstrap(CITIES_CONFIG)

auth, meta, data = bootstrap.fromPasswordFile()
