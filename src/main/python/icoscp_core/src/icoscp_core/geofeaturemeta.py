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
class ExtendedFeatureCollection(FeatureCollection):
    geo: Any

@dataclass(frozen=True)
class ExtendedPosition(Position):
    geo: Any

@dataclass(frozen=True)
class ExtendedLatLonBox(LatLonBox):
    geo: Any

@dataclass(frozen=True)
class ExtendedGeoTrack(GeoTrack):
    geo: Any

@dataclass(frozen=True)
class ExtendedPolygon(Polygon):
    geo: Any

@dataclass(frozen=True)
class ExtendedCircle(Circle):
    geo: Any

@dataclass(frozen=True)
class ExtendedPin(Pin):
    geo: Any


ExtendedGeoFeature: TypeAlias = (
    ExtendedFeatureCollection |
    ExtendedPosition |
    ExtendedLatLonBox |
    ExtendedGeoTrack |
    ExtendedPolygon |
    ExtendedCircle |
    ExtendedPin
)
