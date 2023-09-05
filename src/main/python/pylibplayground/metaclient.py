from metacore import *
from dacite import from_dict
import requests

Envri: TypeAlias = Literal["ICOS", "SITES", "ICOSCities"]


@dataclass
class EnvriConfig:
	envri: Envri
	sparql_endpoint: str
	usage_report_url: str
	token_name: str
	site_used: bool

ICOS_CONFIG = EnvriConfig(
	envri = "ICOS",
	sparql_endpoint = "https://meta.icos-cp.eu/sparql",
	usage_report_url = "https://cpauth.icos-cp.eu/logs/portaluse",
	token_name = "cpauthToken",
	site_used = False
)

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

	def stats_per_spec(self) -> list[tuple[str, int]]:
		raise NotImplementedError

@dataclass
class BoundValue:
	type: Literal["uri", "literal", "bnode"]
	value: str
	datatype: Optional[str]

Binding: TypeAlias = dict[str, BoundValue]

@dataclass
class SparqlResults:
	variable_names: list[str]
	bindings: list[Binding]


class MetadataClient:
	def __init__(self, envri: EnvriConfig):
		self._envri = envri

	def getDataObjectStats(self) -> DobjStats:
		raise NotImplementedError

	def sparql_select(self, query: str, disable_cache: bool = False) -> SparqlResults:
		headers: dict[str, str] = {"Accept": "application/json"}
		if disable_cache:
			headers["Cache-Control"] = "no-cache"
			headers["Pragma"] = "no-cache"
		res = requests.post(url = self._envri.sparql_endpoint, headers=headers, data=bytes(query, "utf-8"))
		res.raise_for_status()
		js = res.json()
		varnames: list[str] = js["head"]["vars"]
		binding_dicts: list[dict[str, Any]] = js["results"]["bindings"]
		bindings = [{key: from_dict(data_class = BoundValue, data = v) for key, v in b_dict.items()} for b_dict in binding_dicts]
		return SparqlResults(varnames, bindings)

icos_meta = MetadataClient(ICOS_CONFIG)

spo = icos_meta.sparql_select("select * where{?s ?p ?o} limit 2")
o1: BoundValue = spo.bindings[0]["o"]

match o1.type:
	case "uri":
		print("first object was a URI")
	case "bnode":
		print("first object was a blank node")
	case "literal":
		print("first object was a literal of type " + (o1.datatype or "xsd:string"))
