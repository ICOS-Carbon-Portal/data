from dataclasses import dataclass
from datetime import datetime
from typing import Generic, Literal, TypeAlias, TypeVar, TypedDict

from icoscp_core.sparql import Binding, as_int, as_uri, as_string
from ..metacore import UriResource


@dataclass
class DataObjectLite:
	uri: str
	filename: str
	size_bytes: int
	datatype_uri: str
	station_uri: str | None
	submission_time: datetime
	time_start: datetime
	time_end: datetime

CategorySelector: TypeAlias = str | UriResource | list[str] | list[UriResource]
TemporalProp = Literal["submTime", "timeStart", "timeEnd"]
IntegerProp = Literal["size"]
StringProp = Literal["fileName"]
SortByProp: TypeAlias = TemporalProp | IntegerProp | StringProp

ContPropName = TypeVar("ContPropName", bound = SortByProp, covariant = True)
ContProp = TypeVar("ContProp", covariant = True)

class PropAction(TypedDict, Generic[ContPropName]):
	by: ContPropName

class ContPropFilter(Generic[ContPropName, ContProp], PropAction[ContPropName], total = False):
	min: ContProp
	max: ContProp
	eq: ContProp
	exclusive: bool

class TemporalFilter(ContPropFilter[TemporalProp, datetime]):
	pass

class IntegerFilter(ContPropFilter[IntegerProp, int]):
	pass

Filtering: TypeAlias = TemporalFilter | IntegerFilter

class Selection(TypedDict, total = False):
	datatype: CategorySelector
	station: CategorySelector
	includeDeprecated: bool

class Sorting(PropAction[SortByProp], total = False):
	descending: bool

class Limit(TypedDict):
	limit: int

class Paging(Limit, total = False):
	offset: int

def _order_clause(order: Sorting | None) -> str:
	if order is None:
		return ""
	if order.get("descending"):
		return f"order by desc(?{order['by']})\n"
	else:
		return f"order by ?{order['by']}\n"

def _deprecated_filter(select: Selection) -> str:
	if not select.get("includeDeprecated"):
		return "FILTER NOT EXISTS {[] cpmeta:isNextVersionOf ?dobj}"
	else:
		return ""

def _selector_values_clause(varname: str, uris: list[str]) -> str:
	if len(uris) == 0:
		return ""
	else:
		return f"VALUES ?{varname} {{ {'<' + '> <'.join(uris) + '>'} }}"

def _get_uri_list(selector: CategorySelector | None) -> list[str]:
	if selector is None: return []
	def to_uri(uri_or_res: object) -> str:
		return getattr(uri_or_res, "uri", None) or str(uri_or_res)
	if type(selector) is list:
		return [to_uri(uri_or_res) for uri_or_res in selector]
	return [to_uri(selector)]

def _is_temporal(prop: SortByProp) -> bool:
	match prop:
		case "submTime": return True
		case "timeStart": return True
		case "timeEnd": return True
		case "fileName": return False
		case "size": return False

def _is_integer(prop: SortByProp) -> bool:
	match prop:
		case "submTime": return False
		case "timeStart": return False
		case "timeEnd": return False
		case "fileName": return False
		case "size": return True

def _filter_clause(f: Filtering) -> str:
	min = f.get("min")
	max = f.get("max")
	eq = f.get("eq")
	if (min is None) and (max is None) and (eq is None): return ""
	conditions: list[str] = []
	prop: IntegerProp | TemporalProp = f["by"]

	def make_cond(op: str, compValue: datetime | int) -> str:
		compValueStr: str
		if _is_integer(prop) and type(compValue) is int:
			compValueStr = f"\"{compValue}\"^^xsd:integer"
		elif _is_temporal(prop) and type(compValue) is datetime:
			compValueStr = f"\"{compValue.isoformat()}\"^^xsd:dateTime"
		else: return ""
		return f"?{prop} {op} {compValueStr}"

	orEq = "=" if not f.get("exclusive") else ""
	if not (eq is None):
		conditions.append(make_cond("=", eq))
	if not (min is None):
		conditions.append(make_cond(f">{orEq}", min))
	if not (max is None):
		conditions.append(make_cond(f"<{orEq}", max))

	conditions = [c for c in conditions if c != ""]
	if len(conditions) == 0: return ""
	return f"FILTER ({' && '.join(conditions)})"

def dataobj_lite_list(
	select: Selection,
	filter: list[Filtering],
	order: Sorting | None,
	page: Paging
) -> str:

	specUris =  _get_uri_list(select.get("datatype"))
	stationUris = _get_uri_list(select.get("station"))
	stationMandatory = "?dobj cpmeta:wasAcquiredBy/prov:wasAssociatedWith ?station ."
	stationLink = f"OPTIONAL{{ {stationMandatory} }}" if len(stationUris) == 0 else stationMandatory

	filter_clauses = "\n".join(map(_filter_clause, filter))

	return f"""
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
select ?dobj ?spec ?station ?fileName ?size ?submTime ?timeStart ?timeEnd
where {{
	{_selector_values_clause('spec', specUris)}
	?dobj cpmeta:hasObjectSpec ?spec .
	{_selector_values_clause('station', stationUris)}
	{stationLink}
	?dobj cpmeta:hasSizeInBytes ?size .
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .
	?dobj cpmeta:hasStartTime | (cpmeta:wasAcquiredBy / prov:startedAtTime) ?timeStart .
	?dobj cpmeta:hasEndTime | (cpmeta:wasAcquiredBy / prov:endedAtTime) ?timeEnd .
	{_deprecated_filter(select)}
	{filter_clauses}
}}
{_order_clause(order)}offset {page.get('offset') or 0} limit {page['limit']}"""

def parse_dobj_lite(row: Binding) -> DataObjectLite:
	raise NotImplementedError
	# return DataObjectLite(
	# )

testq = dataobj_lite_list(
	select = {"datatype": "http://meta.icos-cp.eu/resources/cpmeta/atcCo2Product"},
	filter = [{"by": "submTime", "min": datetime.fromisoformat("2023-05-05T12:00:00Z")}],
	order = {"by": "size"},
	page = {"limit": 100}
)
