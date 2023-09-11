from typing import Literal, TypeAlias
from dataclasses import dataclass

Envri: TypeAlias = Literal["ICOS", "SITES", "ICOSCities"]

@dataclass
class EnvriConfig:
	envri: Envri
	sparql_endpoint: str
	meta_instance_prefix: str
	usage_report_url: str
	token_name: str
	site_used: bool

ICOS_CONFIG = EnvriConfig(
	envri = "ICOS",
	sparql_endpoint = "https://meta.icos-cp.eu/sparql",
	meta_instance_prefix = "http://meta.icos-cp.eu/",
	usage_report_url = "https://cpauth.icos-cp.eu/logs/portaluse",
	token_name = "cpauthToken",
	site_used = False
)

SITES_CONFIG = EnvriConfig(
	envri = "SITES",
	sparql_endpoint = "https://meta.fieldsites.se/sparql",
	meta_instance_prefix = "https://meta.fieldsites.se",
	usage_report_url = "https://auth.fieldsites.se/logs/portaluse",
	token_name = "fieldsitesToken",
	site_used = True
)

CITIES_CONFIG = EnvriConfig(
	envri = "ICOSCities",
	sparql_endpoint = "https://citymeta.icos-cp.eu/sparql",
	meta_instance_prefix = "https://citymeta.icos-cp.eu/sparql",
	usage_report_url = "https://cpauth.icos-cp.eu/logs/portaluse",
	token_name = "cpauthToken",
	site_used = False
)

ENVRIES: dict[Envri, EnvriConfig] = {
	"ICOS": ICOS_CONFIG,
	"SITES": SITES_CONFIG,
	"ICOSCities": CITIES_CONFIG
}
