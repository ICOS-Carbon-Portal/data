from requests import get
from metacore import *

def get_cp_json(url: str, data_class: Type[CPJson]) -> CPJson:
	resp = get(url = url, headers={"Accept": "application/json"})
	return parse_cp_json(resp.text, data_class=data_class)

def get_data_object(url: str) -> DataObject:
	return get_cp_json(url, DataObject)

gtfStation = get_cp_json("https://meta.icos-cp.eu/resources/stations/ES_IE-GtF", Station)

gtfId = gtfStation.id

@dataclass
class EnvriConfig:
	sparql_endpoint: str
	usage_report_url: str
	token_name: str
	site_used: bool

@dataclass(frozen=True)
class DobjStatsKey:
	spec_url: str
	submitter_url: str
	station_url: Optional[str]
	site_url: Optional[str]

@dataclass(frozen=True)
class DobjSpecLite:
	url: str
	project_url: str
	theme_url: str
	format_url: str
	data_level: int
	specificDatasetType: DatasetType


class DobjStats:
	def _init_(self, stats: dict[DobjStatsKey, int], specs: list[DobjSpecLite]):
		self._stats = stats
		self._specs = specs

class MetadataClient:
	def _init_(self, envri: EnvriConfig):
		self._envri = envri

