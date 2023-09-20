from datetime import datetime
from typing import TypeAlias, Optional, Any
from dataclasses import dataclass
import re
import requests

@dataclass
class BoundUri:
	uri: str

@dataclass
class BoundLiteral:
	value: str
	datatype: Optional[str]

BoundValue: TypeAlias = BoundUri | BoundLiteral

Binding: TypeAlias = dict[str, BoundValue]

@dataclass
class SparqlResults:
	variable_names: list[str]
	bindings: list[Binding]

def lookup(varname: str, binding: Binding) -> BoundValue:
	v = binding.get(varname)
	if not v:
		raise ValueError(f"Variable {varname} had no bound values in SPARQL response")
	else:
		return v

def lookup_literal_value(varname: str, datatype: Optional[str], binding: Binding) -> str:
	bv = lookup(varname, binding)
	if type(bv) is BoundLiteral:
		if not(datatype) or bv.datatype == datatype:
			return bv.value
		else:
			raise _type_error(varname, f"literal datatype {datatype}", bv)
	else:
		raise _type_error(varname, "a literal", bv)

def as_int(varname: str, binding: Binding) -> int:
	int_str = lookup_literal_value(varname, "http://www.w3.org/2001/XMLSchema#integer", binding)
	return int(int_str)

def as_double(varname: str, binding: Binding) -> float:
	long_str = lookup_literal_value(varname, "http://www.w3.org/2001/XMLSchema#double", binding)
	return float(long_str)

def as_long(varname: str, binding: Binding) -> int:
	long_str = lookup_literal_value(varname, "http://www.w3.org/2001/XMLSchema#long", binding)
	return int(long_str)

def as_string(varname: str, binding: Binding) -> str:
	return lookup_literal_value(varname, None, binding)

def as_datetime(varname: str, binding: Binding) -> datetime:
	dtStr = lookup_literal_value(varname, "http://www.w3.org/2001/XMLSchema#dateTime", binding)
	return datetime.fromisoformat(re.sub(r'Z$', '+00:00', dtStr))


def as_uri(varname: str, binding: Binding) -> str:
	bv = lookup(varname, binding)
	if type(bv) is BoundUri:
		return bv.uri
	else:
		raise _type_error(varname, "a uri value", bv)

def as_opt_double(varname: str, binding: Binding) -> float | None:
	if varname in binding.keys():
		return as_double(varname, binding)
	else: return None

def as_opt_str(varname: str, binding: Binding) -> str | None:
	if varname in binding.keys():
		return as_string(varname, binding)
	else: return None

def as_opt_uri(varname: str, binding: Binding) -> str | None:
	if varname in binding.keys():
		return as_uri(varname, binding)
	else: return None

def _type_error(varname: str, expected: str, bv: BoundValue) -> ValueError:
	msg = f"Was expecting {expected}, got value {bv} for variable {varname} in SPARQL results"
	return ValueError(msg)

def get_sparql_select_json(endpoint: str, query: str, disable_cache: bool) -> Any:
	headers: dict[str, str] = {"Accept": "application/json"}
	if disable_cache:
		headers["Cache-Control"] = "no-cache"
		headers["Pragma"] = "no-cache"
	res = requests.post(url = endpoint, headers=headers, data=bytes(query, "utf-8"))
	if res.status_code != 200:
		raise Exception(f"SPARQL SELECT problem, got response: {res.text}\nThe query was: {query}")
	return res.json()

def sparql_select(endpoint: str, query: str, disable_cache: bool) -> SparqlResults:
	js = get_sparql_select_json(endpoint, query, disable_cache)
	varnames: list[str] = js["head"]["vars"]
	binding_dicts: list[dict[str, Any]] = js["results"]["bindings"]
	bindings = [{key: _parse_bound_value(v) for key, v in b_dict.items()} for b_dict in binding_dicts]
	return SparqlResults(varnames, bindings)

def _parse_bound_value(v: Any) -> BoundValue:
	match v["type"]:
		case "uri": return BoundUri(uri = v["value"])
		case "literal": return BoundLiteral(value = v["value"], datatype=v.get("datatype"))
		case "bnode": raise ValueError("Blank nodes in SPARQL return results are not supported by this" +
			" library. Please re-formulate your query.")
		case bad: raise ValueError(f"Unexpected result type encountered in SPARQL response: {bad}")
