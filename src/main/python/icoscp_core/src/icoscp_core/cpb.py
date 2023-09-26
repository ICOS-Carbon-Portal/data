from abc import ABC, abstractmethod
from typing import Any, Callable
from .metacore import DataObject, StationTimeSeriesMeta
from .envri import EnvriConfig
from .metaclient import MetadataClient
from .queries.dataobjlist import DataObjectLite


class Codec(ABC):
	@abstractmethod
	def json_payload(self, cols: list[str]) -> dict[str, Any]:
		pass


class SingleObjectCodec(Codec):
	def __init__(
		self,
		conf: EnvriConfig,
		dobj: str | DataObjectLite | DataObject
	) -> None:
		if isinstance(dobj, DataObject):
			self._dobj = dobj
		else:
			mdc = MetadataClient(conf)
			if isinstance(dobj, str):
				self._dobj = mdc.get_dobj_meta(dobj)
			else:
				self._dobj = mdc.get_dobj_meta(dobj.uri)
		self._dobj_meta = self._get_metadata()
		self._cols_meta = self._parse_metadata_columns()

	def json_payload(self, cols: list[str] | None, offset: int | None = None, length: int | None = None) -> dict[str, Any]:
		indexes_meta = [ind for ind, _, _ in self._cols_meta]
		if cols is None:
			indexes_cols = indexes_meta
		else:
			labels_meta = [label for _, label, _ in self._cols_meta]
			indexes_cols = [indexes_meta[labels_meta.index(label)] for label in cols]

		json = {
			"tableId": self._dobj.hash,
			"subFolder": self._dobj.specification.format.uri.split("/")[-1],
			"schema": {
				"columns": [_get_fmt(fmt) for _, _, fmt in self._cols_meta],
				"size": self._dobj_meta.nRows
			},
			"columnNumbers": indexes_cols
		}
		if offset is not None or length is not None:
			if offset is None:
				offset = 0
			if length is None:
				length = self._dobj_meta.nRows
			json["slice"] = {
				"offset": offset,
				"length": length
			}

		return json

	def get_info_columns(self, lookup: Callable[[str], Any], cols: list[str] | None) -> list[Any]:
		if cols is None:
			return [lookup(_get_fmt(fmt)) for _, _, fmt in self._cols_meta]
		else:
			fmt_lookup = {label: fmt for _, label, fmt in self._cols_meta}
			fmt_cols = [fmt_lookup[label] for label in cols]
			return [lookup(_get_fmt(fmt)) for fmt in fmt_cols]

	def get_labels_meta_columns(self) -> list[str]:
		return [label for _, label, _ in self._cols_meta]

	def _get_metadata(self) -> StationTimeSeriesMeta:
		if isinstance(self._dobj.specificInfo, StationTimeSeriesMeta):
			return self._dobj.specificInfo
		else:
			raise Exception(f"Object {self._dobj.hash} is not a time series data object.")

	def _parse_metadata_columns(self) -> list[tuple[int, str, str]]:
		cols_meta = self._dobj_meta.columns
		if cols_meta is None:
			raise Exception(f"Metadata of object '{self._dobj.hash}' does not include any column name")
		else:
			cols_meta.sort(key=lambda varMeta: varMeta.label)
			cols_meta_parsed = [
				(ind, col.label, col.valueFormat.split("/")[-1]) for ind, col in enumerate(cols_meta)
				if col.valueFormat is not None
			]
			if len(cols_meta_parsed) == 0:
				raise Exception(f"Metadata of object '{self._dobj.hash}' does not include any column for which value format is provided")
			else:
				return cols_meta_parsed


def _get_fmt(fmt_uri: str) -> str:
	fmt_conv = {
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
	return fmt_conv[fmt_uri.split("/")[-1]]