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

@dataclass
class ExtendedFeatureCollection(FeatureCollection):
    geo: Any

@dataclass
class ExtendedPosition(Position):
    geo: Any

@dataclass
class ExtendedLatLonBox(LatLonBox):
    geo: Any

@dataclass
class ExtendedGeoTrack(GeoTrack):
    geo: Any

@dataclass
class ExtendedPolygon(Polygon):
    geo: Any

@dataclass
class ExtendedCircle(Circle):
    geo: Any

@dataclass
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
