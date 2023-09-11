from envri import EnvriConfig
from sparql import SparqlResults, sparql_select as sparql_select_generic
from sparql_queries import dobj_spec_lite_list, parse_dobj_spec_lite, DobjSpecLite
from dataclasses import dataclass
from typing import Optional


@dataclass
class DobjLite:
	uri: str
	file_name: str
	datatype_uri: str
	submitter_uri: str
	station_uri: Optional[str]
	site_uri: Optional[str]


class MetadataClient:
	def __init__(self, envri_conf: EnvriConfig):
		self._envri_conf = envri_conf

	def sparql_select(self, query: str, disable_cache: bool = False) -> SparqlResults:
		endpoint = self._envri_conf.sparql_endpoint
		return sparql_select_generic(endpoint, query, disable_cache)

	def list_datatypes(self) -> list[DobjSpecLite]:
		query = dobj_spec_lite_list(self._envri_conf)
		qres = self.sparql_select(query)
		return [parse_dobj_spec_lite(b) for b in qres.bindings]

	def list_data_objects(
		self,
		datatype: Optional[str | list[str]] = None,
		limit: int = 1000
	) -> list[DobjLite]:
		raise NotImplementedError
