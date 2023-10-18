from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, TypeAlias, TypedDict

from ..sparql import Binding, as_long, as_uri, as_opt_uri, as_string, as_datetime, as_opt_float
from ..metacore import UriResource


@dataclass(frozen=True)
class DataObjectLite:
	uri: str
	filename: str
	size_bytes: int
	datatype_uri: str
	station_uri: str | None
	sampling_height: float | None
	submission_time: datetime
	time_start: datetime
	time_end: datetime

CategorySelector: TypeAlias = str | UriResource | list[str] | list[UriResource] | None
TemporalProp = Literal["submTime", "timeStart", "timeEnd"]
IntegerProp = Literal["size"]
StringProp = Literal["fileName"]
OrderByProp: TypeAlias = TemporalProp | IntegerProp | StringProp
ExclusiveComparator: TypeAlias = Literal["<", ">"]
Comparator: TypeAlias = ExclusiveComparator | Literal["<=", ">=", "="]

class Filter(ABC):
	@abstractmethod
	def render(self) -> str: pass

@dataclass(frozen=True)
class TimeFilter(Filter):
	prop: TemporalProp
	op: ExclusiveComparator
	value: datetime | str

	def render(self) -> str:
		v = self.value
		dtStr = v.isoformat() if type(v) is datetime else str(v)
		return f'?{self.prop} {self.op} "{dtStr}"^^xsd:dateTime'

@dataclass(frozen=True)
class SizeFilter(Filter):
	op: Comparator
	value: int

	def render(self) -> str:
		return f'?size {self.op} "{self.value}"^^xsd:integer'

@dataclass(frozen=True)
class SamplingHeightFilter(Filter):
	op: Comparator
	value: float

	def render(self) -> str:
		return f'?samplingHeight {self.op} "{self.value}"^^xsd:float'

class SortProp(TypedDict):
	prop: OrderByProp
class OrderBy(SortProp, total = False):
	descending: bool

def _order_clause(order: OrderBy | OrderByProp | None) -> str:
	if order is None:
		return ""
	if type(order) is str:
		return f"order by ?{order}\n"
	if type(order) is dict:
		prop = order['prop']
		return f"order by desc(?{prop})\n" if order.get("descending") else f"order by ?{prop}\n"
	else:
		return ""

def _selector_values_clause(varname: str, uris: list[str]) -> str:
	if len(uris) == 0:
		return ""
	else:
		return f"VALUES ?{varname} {{ {'<' + '> <'.join(uris) + '>'} }}"

def _get_uri_list(selector: CategorySelector) -> list[str]:
	if selector is None: return []
	def to_uri(uri_or_res: object) -> str:
		return getattr(uri_or_res, "uri", None) or str(uri_or_res)
	if type(selector) is list:
		return [to_uri(uri_or_res) for uri_or_res in selector]
	return [to_uri(selector)]

def dataobj_lite_list(
	datatype: CategorySelector,
	station: CategorySelector,
	filters: list[Filter],
	include_deprecated: bool,
	order_by: OrderBy | OrderByProp | None,
	limit: int,
	offset: int
) -> str:

	specUris =  _get_uri_list(datatype)
	stationUris = _get_uri_list(station)
	stationMandatory = "?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station ."
	stationLink = f"OPTIONAL{{ {stationMandatory} }}" if len(stationUris) == 0 else stationMandatory
	samplingHeightPresent = any(f is SamplingHeightFilter for f in filters)
	heightMandatory = "?dobj cpmeta:wasAcquiredBy/cpmeta:hasSamplingHeight ?samplingHeight ."
	heightLink = heightMandatory if samplingHeightPresent else  f"OPTIONAL{{ {heightMandatory} }}"

	filter_clauses = "" if len(filters) == 0 else "FILTER(" + " && ".join([f.render() for f in filters]) + ")"

	return f"""
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
select ?dobj ?spec ?station ?samplingHeight ?fileName ?size ?submTime ?timeStart ?timeEnd
where {{
	{_selector_values_clause('spec', specUris)}
	?dobj cpmeta:hasObjectSpec ?spec .
	{_selector_values_clause('station', stationUris)}
	{stationLink}
	{heightLink}
	?dobj cpmeta:hasSizeInBytes ?size .
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .
	?dobj cpmeta:hasStartTime | (cpmeta:wasAcquiredBy / prov:startedAtTime) ?timeStart .
	?dobj cpmeta:hasEndTime | (cpmeta:wasAcquiredBy / prov:endedAtTime) ?timeEnd .
	{"" if include_deprecated else "FILTER NOT EXISTS {[] cpmeta:isNextVersionOf ?dobj}"}
	{filter_clauses}
}}
{_order_clause(order_by)}offset {offset} limit {min(limit, 10000)}"""

def parse_dobj_lite(row: Binding) -> DataObjectLite:
	return DataObjectLite(
		uri = as_uri("dobj", row),
		filename = as_string("fileName", row),
		size_bytes = as_long("size", row),
		datatype_uri = as_uri("spec", row),
		station_uri = as_opt_uri("station", row),
		sampling_height = as_opt_float("samplingHeight", row),
		submission_time = as_datetime("submTime", row),
		time_start = as_datetime("timeStart", row),
		time_end = as_datetime("timeEnd", row)
	)
