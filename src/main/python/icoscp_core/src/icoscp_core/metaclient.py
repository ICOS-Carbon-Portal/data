import requests
from .envri import EnvriConfig
from .sparql import SparqlResults, sparql_select as sparql_select_generic
from .queries.speclist import dobj_spec_lite_list, parse_dobj_spec_lite, DobjSpecLite
from .queries.dataobjlist import DataObjectLite, parse_dobj_lite, dataobj_lite_list
from .queries.dataobjlist import OrderBy, OrderByProp, Filter, CategorySelector
from .metacore import DataObject, CPJson, parse_cp_json, DataObjectSpec
from typing import Type

class MetadataClient:
	def __init__(self, envri_conf: EnvriConfig):
		self._envri_conf = envri_conf

	def sparql_select(self, query: str, disable_cache: bool = False) -> SparqlResults:
		endpoint = self._envri_conf.sparql_endpoint
		return sparql_select_generic(endpoint, query, disable_cache)

	def list_datatypes(self) -> list[DobjSpecLite]:
		"""
		List available data types
		"""
		query = dobj_spec_lite_list(self._envri_conf)
		qres = self.sparql_select(query)
		return [parse_dobj_spec_lite(b) for b in qres.bindings]

	def list_data_objects(
		self,
		datatype: CategorySelector = None,
		station: CategorySelector = None,
		filters: list[Filter] = [],
		includeDeprecated: bool = False,
		orderBy: OrderBy | OrderByProp | None = {"prop": "submTime", "descending": True},
		limit: int = 100,
		offset: int = 0
	) -> list[DataObjectLite]:
		query = dataobj_lite_list(datatype, station, filters, includeDeprecated, orderBy, limit, offset)
		qres = self.sparql_select(query)
		return [parse_dobj_lite(b) for b in qres.bindings]
	
	def get_datatype_meta(self, dtype: str | DobjSpecLite) -> DataObjectSpec:
		dtype_uri: str
		
		if type(dtype) == str: dtype_uri = dtype
		elif type(dtype) == DobjSpecLite: dtype_uri = dtype.uri
		else: raise ValueError("Dtype must be either landing page URL or an instance of DobjSpecLite")

		return _get_json_meta(dtype_uri, DataObjectSpec)

	def get_dobj_meta(self, dobj: str | DataObjectLite) -> DataObject:
		dobj_uri: str

		if type(dobj) == str: dobj_uri = dobj
		elif type(dobj) == DataObjectLite: dobj_uri = dobj.uri
		else: raise ValueError("Dobj must be either landing page URL or an instance of DataObjectLite")

		return _get_json_meta(dobj_uri, DataObject)

def _get_json_meta(url: str, data_class: Type[CPJson]) -> CPJson:
	resp = requests.get(url = url, headers={"Accept": "application/json"})
	return parse_cp_json(resp.text, data_class=data_class)
