from array import array
import io
import struct
from typing import Any, TypeAlias
from dataclasses import dataclass
from datetime import datetime, time
from .metacore import DataObject, StationTimeSeriesMeta, URI

AnyArray: TypeAlias = Any # bad typing support for array.array

@dataclass
class ColumnInfo:
	index: int
	label: str
	value_format_uri: str

@dataclass
class TableRequest:
	desired_columns: list[str] | None
	offset: int | None
	length: int | None

@dataclass
class CodecInfo(TableRequest):
	dobj_hash: str
	obj_format_uri: URI
	columns: list[ColumnInfo]
	n_rows: int

def codec_from_dobj_meta(dobj: DataObject, request: TableRequest) -> "Codec":
	spec_info = dobj.specificInfo
	if not isinstance(spec_info, StationTimeSeriesMeta):
			raise Exception(f"Object {dobj.hash} is not a station-specific time series data object.")
	cols_meta = spec_info.columns
	if cols_meta is None:
		raise Exception(f"Metadata of object '{dobj.hash}' does not include any column information")
	cols_meta.sort(key=lambda col: col.label)
	cols_meta_parsed = [
		ColumnInfo(index=ind, label=col.label, value_format_uri=col.valueFormat) for ind, col in enumerate(cols_meta)
		if col.valueFormat is not None
	]
	if len(cols_meta_parsed) == 0:
		raise Exception(f"Metadata of object '{dobj.hash}' does not include any column for which value format is provided")
	n_rows = spec_info.nRows
	if n_rows is None:
		raise Exception(f"Metadata of object '{dobj.hash}' does not include the number of table rows")
	ci = CodecInfo(
		dobj_hash=dobj.hash,
		obj_format_uri=dobj.specification.format.uri,
		columns = cols_meta_parsed,
		n_rows=n_rows,
		desired_columns=request.desired_columns,
		offset=request.offset,
		length=request.length
	)
	return Codec(ci)

class Codec:
	def __init__(self, ci: CodecInfo) -> None:
		desired_indices: list[int]
		try:
			if ci.desired_columns is None:
				desired_indices = [col.index for col in ci.columns]
			else:
				labels = [col_info.label for col_info in ci.columns]
				tmp_indices = [labels.index(desired_col) for desired_col in ci.desired_columns]
				desired_indices = [ci.columns[ind].index for ind in tmp_indices]
		except ValueError:
			raise ValueError(f'One of the columns desired to be fetched is not actually present in data object {ci.dobj_hash}')

		# The following checks are needed because the backend does not return user-friendly error messages or results.
		for param, val in [("offset", ci.offset), ("length", ci.length)]:
			if val is not None and val > ci.n_rows:
				raise ValueError(f"The value provided for the '{param}' parameter ({val}) is larger than the number of available rows ({ci.n_rows})")
		if ci.offset is not None and ci.length is not None and ci.n_rows - ci.offset < ci.length:
			raise ValueError(
				f"The value provided for the 'length' parameter ({ci.length}) is larger than the number of available rows ({ci.n_rows}) "
				f"minus the value provided for the 'offset' parameter ({ci.offset})"
			)

		json = {
			"tableId": ci.dobj_hash,
			"subFolder": ci.obj_format_uri.split("/")[-1],
			"schema": {
				"columns": [_get_fmt(col_info.value_format_uri) for col_info in ci.columns],
				"size": ci.n_rows
			},
			"columnNumbers": desired_indices
		}
		if ci.offset is not None or ci.length is not None:
			offset = ci.offset or 0
			length = ci.length or (ci.n_rows - offset)
			json["slice"] = {
				"offset": offset,
				"length": length
			}
		self._ci = ci
		self._json_payload = json
		self._desired_indices = desired_indices

	@property
	def json_payload(self):
		return self._json_payload

	def parse_cpb_response(self, resp: io.BufferedReader) -> dict[str, list[time | datetime] | AnyArray]:
		res: dict[str, AnyArray] = {}
		cols = self._ci.columns
		n_rows = self._ci.n_rows
		if self._ci.offset: n_rows -= self._ci.offset
		if self._ci.length: n_rows = min(n_rows, self._ci.length)
		for n in self._desired_indices:
			fmt = _get_fmt(cols[n].value_format_uri)
			fmt_char = _get_format_char(fmt)
			struct_fmt = f">{n_rows}{fmt_char}"
			must_read = _get_byte_size(fmt) * n_rows
			col_bytes = resp.read(must_read)
			if must_read > len(col_bytes):
				raise IOError(f'Error while reading cpb response for column {cols[n].label} ({n_rows} values), reached end of data, but got only {len(col_bytes)} bytes instead of {must_read}')
			arr: AnyArray = array(fmt_char)
			arr.extend(struct.unpack(struct_fmt, col_bytes))
			res[cols[n].label] = self._type_converter(arr, cols[n].value_format_uri)
		return res

	def _type_converter(self, arr: AnyArray, fmt: URI) -> list[time | datetime] | AnyArray:
		fmt_str = fmt.split("/")[-1]
		if fmt_str == "bmpChar":
			return array("u", [chr(v) for v in arr])
		elif fmt_str == "iso8601timeOfDay":
			return [time(v//3600, (v%3600)//60, (v%3600)%60) for v in arr]
		elif fmt_str in ["etcDate", "iso8601date"]:
			return [datetime.fromtimestamp(v*86400) for v in arr]
		elif fmt_str in ["iso8601dateTime", "iso8601LocalDateTime", "etcLocalDateTime"]:
			return [datetime.fromtimestamp(v/1000) for v in arr]
		else:
			return arr

_fmt_uri_to_fmt = {
	'float32': 'FLOAT',
	'float64': 'DOUBLE',
	'bmpChar': 'CHAR',
	'etcDate': 'INT',
	'iso8601date':'INT',
	'iso8601timeOfDay':'INT',
	'iso8601dateTime': 'DOUBLE',
	'isoLikeLocalDateTime' : 'DOUBLE',
	'etcLocalDateTime': 'DOUBLE',
	'int32':'INT',
	'string':'STRING'
}
def _get_fmt(fmt_uri: str) -> str:
	return _fmt_uri_to_fmt[fmt_uri.split("/")[-1]]

_fmt_to_fmt_char = {
	'INT': 'l',
	'FLOAT': 'f',
	'DOUBLE': 'd',
	'SHORT': 'h',
	'CHAR': 'H',
	'BYTE': 'b',
}

def _get_format_char(fmt: str) -> str:
	try:
		return _fmt_to_fmt_char[fmt]
	except KeyError:
		raise ValueError(f"Unsupported cpb value format {fmt}")

_fmt_to_byte_size = {
	'INT': 4,
	'FLOAT': 4,
	'DOUBLE': 8,
	'SHORT': 2,
	'CHAR': 2,
	'BYTE': 1,
	'STRING': 4
}

def _get_byte_size(fmt: str) -> int:
	return _fmt_to_byte_size[fmt]
