from typing import TypeAlias, Any
from dataclasses import dataclass
from .metacore import (
	FeatureCollection,
	Position,
	LatLonBox,
	GeoTrack,
	Polygon,
	Circle,
	Pin
)

@dataclass(frozen=True)
class GeoJsonHolder:
	geo: Any

@dataclass(frozen=True)
class FeatureCollectionWithGeo(FeatureCollection, GeoJsonHolder): pass

@dataclass(frozen=True)
class PositionWithGeo(Position, GeoJsonHolder): pass

@dataclass(frozen=True)
class LatLonBoxWithGeo(LatLonBox, GeoJsonHolder): pass

@dataclass(frozen=True)
class GeoTrackWithGeo(GeoTrack, GeoJsonHolder): pass

@dataclass(frozen=True)
class PolygonWithGeo(Polygon, GeoJsonHolder): pass

@dataclass(frozen=True)
class CircleWithGeo(Circle, GeoJsonHolder): pass

@dataclass(frozen=True)
class PinWithGeo(Pin, GeoJsonHolder): pass

GeoFeatureWithGeo: TypeAlias = (
	FeatureCollectionWithGeo |
	PositionWithGeo |
	LatLonBoxWithGeo |
	GeoTrackWithGeo |
	PolygonWithGeo |
	CircleWithGeo |
	PinWithGeo
)
