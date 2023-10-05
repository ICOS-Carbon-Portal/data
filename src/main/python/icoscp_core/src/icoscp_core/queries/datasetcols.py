from dataclasses import dataclass
from ..metacore import URI
from ..sparql import Binding, as_string, as_uri, as_opt_bool

@dataclass
class DataSetCol:
	col_title: str
	val_format: URI
	is_optional: bool
	is_regex: bool

def query_dataset_columns(dataset: URI) -> str:
	return f"""
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select ?colTitle ?valFormat ?isOptional ?isRegex where{{
	<{dataset}> cpmeta:hasColumn ?col .
	?col cpmeta:hasColumnTitle ?colTitle ; cpmeta:hasValueFormat ?valFormat .
	optional{{?col cpmeta:isOptionalColumn ?isOptional}}
	optional{{?col cpmeta:isRegexColumn ?isRegex}}
}}"""

def parse_dataset_column(binding: Binding) -> DataSetCol:
	return DataSetCol(
		col_title=as_string("colTitle", binding),
		val_format=as_uri("valFormat", binding),
		is_optional=as_opt_bool("isOptional", binding) or False,
		is_regex=as_opt_bool("isRegex", binding) or False
	)