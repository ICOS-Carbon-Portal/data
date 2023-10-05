import json
from dataclasses import dataclass
from ..metacore import URI
from ..sparql import Binding, as_uri, as_int, as_opt_str

@dataclass
class CpbMetaData:
	dobj: URI
	dataset_spec: URI
	obj_format: URI
	n_rows: int
	col_names: list[str] | None

def query_cpb_metadata(dobjs: list[URI]) -> str:
	return f"""
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select * where{{
	values ?dobj {{ <{'> <'.join(dobjs)}> }}
	?dobj cpmeta:hasObjectSpec [cpmeta:containsDataset ?dsSpec ; cpmeta:hasFormat ?objFormat ] ;
		cpmeta:hasNumberOfRows ?nRows .
	optional{{?dobj cpmeta:hasActualColumnNames ?colNames }}
}}"""

def parse_cpb_metadata(binding: Binding) -> CpbMetaData:
	col_names_json = as_opt_str("colNames", binding)
	return CpbMetaData(
		dobj=as_uri("dobj", binding),
		dataset_spec=as_uri("dsSpec", binding),
		obj_format=as_uri("objFormat", binding),
		n_rows=as_int("nRows", binding),
		col_names=json.loads(col_names_json) if col_names_json else None
	)