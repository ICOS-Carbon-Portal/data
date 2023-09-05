from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Literal, Type, TypeAlias, TypeVar, Any
from dacite import Config, from_dict
import json

Orcid: TypeAlias = str
DoiMeta: TypeAlias = object
Instant: TypeAlias = str
URI: TypeAlias = str
CountryCode: TypeAlias = str
Sha256Sum: TypeAlias = str
LocalDate: TypeAlias = str
JsValue: TypeAlias = object

PinKind: TypeAlias = Literal["Sensor" , "Other"]

@dataclass
class FeatureCollection:
	features: list[GeoFeature]
	label: Optional[str]
	uri: Optional[URI]


@dataclass
class Position:
	lat: float
	lon: float
	alt: Optional[float]
	label: Optional[str]
	uri: Optional[URI]


@dataclass
class LatLonBox:
	min: Position
	max: Position
	label: Optional[str]
	uri: Optional[URI]


@dataclass
class GeoTrack:
	points: list[Position]
	label: Optional[str]
	uri: Optional[URI]


@dataclass
class Polygon:
	vertices: list[Position]
	label: Optional[str]
	uri: Optional[URI]


@dataclass
class Circle:
	center: Position
	radius: float
	label: Optional[str]
	uri: Optional[URI]


@dataclass
class Pin:
	position: Position
	kind: PinKind


GeoFeature: TypeAlias = FeatureCollection | Position | LatLonBox | GeoTrack | Polygon | Circle | Pin

@dataclass
class TimeInterval:
	start: Instant
	stop: Instant


@dataclass
class TemporalCoverage:
	interval: TimeInterval
	resolution: Optional[str]


@dataclass
class PlainStaticObject:
	res: URI
	hash: Sha256Sum
	name: str


@dataclass
class StaticCollection:
	res: URI
	hash: Sha256Sum
	members: list[StaticDataItem]
	creator: Organization
	title: str
	description: Optional[str]
	previousVersion: Optional[URI]
	nextVersion: Optional[URI | list[URI]]
	latestVersion: URI | list[URI]
	doi: Optional[str]
	references: References


StaticDataItem: TypeAlias = PlainStaticObject | StaticCollection

DataItemCollection: TypeAlias = StaticCollection

DataItem: TypeAlias = StaticDataItem | DataItemCollection

@dataclass
class UriResource:
	uri: URI
	label: Optional[str]
	comments: list[str]


@dataclass
class LinkBox:
	name: str
	coverImage: URI
	target: URI
	orderWeight: Optional[int]


@dataclass
class WebpageElements:
	self: UriResource
	coverImage: Optional[URI]
	linkBoxes: Optional[list[LinkBox]]


@dataclass
class Organization:
	self: UriResource
	name: str
	email: Optional[str]
	website: Optional[URI]
	webpageDetails: Optional[WebpageElements]


@dataclass
class Person:
	self: UriResource
	firstName: str
	lastName: str
	email: Optional[str]
	orcid: Optional[Orcid]


@dataclass
class Site:
	self: UriResource
	ecosystem: UriResource
	location: Optional[GeoFeature]


@dataclass
class Project:
	self: UriResource
	keywords: Optional[list[str]]


@dataclass
class DataTheme:
	self: UriResource
	icon: URI
	markerIcon: Optional[URI]


@dataclass
class DataObjectSpec:
	self: UriResource
	project: Project
	theme: DataTheme
	format: UriResource
	encoding: UriResource
	dataLevel: int
	specificDatasetType: DatasetType
	datasetSpec: Optional[DatasetSpec]
	documentation: list[PlainStaticObject]
	keywords: Optional[list[str]]


@dataclass
class DatasetSpec:
	self: UriResource
	resolution: Optional[str]


@dataclass
class DataAcquisition:
	station: Station
	site: Optional[Site]
	interval: Optional[TimeInterval]
	instrument: Optional[UriResource | list[UriResource]]
	samplingPoint: Optional[Position]
	samplingHeight: Optional[float]


@dataclass
class DataProduction:
	creator: Agent
	contributors: list[Agent]
	host: Optional[Organization]
	comment: Optional[str]
	sources: list[PlainStaticObject]
	documentation: Optional[PlainStaticObject]
	dateTime: Instant


@dataclass
class DataSubmission:
	submitter: Organization
	start: Instant
	stop: Optional[Instant]


@dataclass
class StationTimeSeriesMeta:
	acquisition: DataAcquisition
	productionInfo: Optional[DataProduction]
	nRows: Optional[int]
	coverage: Optional[GeoFeature]
	columns: Optional[list[VarMeta]]


@dataclass
class ValueType:
	self: UriResource
	quantityKind: Optional[UriResource]
	unit: Optional[str]


@dataclass
class VarMeta:
	model: UriResource
	label: str
	valueType: ValueType
	valueFormat: Optional[URI]
	minMax: Optional[tuple[float, float]]
	instrumentDeployments: Optional[list[InstrumentDeployment]]


@dataclass
class SpatioTemporalMeta:
	title: str
	description: Optional[str]
	spatial: GeoFeature
	temporal: TemporalCoverage
	station: Optional[Station]
	samplingHeight: Optional[float]
	productionInfo: DataProduction
	variables: Optional[list[VarMeta]]


@dataclass
class DataObject:
	hash: Sha256Sum
	accessUrl: Optional[URI]
	pid: Optional[str]
	doi: Optional[str]
	fileName: str
	size: Optional[int]
	submission: DataSubmission
	specification: DataObjectSpec
	specificInfo: SpatioTemporalMeta | StationTimeSeriesMeta
	previousVersion: Optional[URI | list[URI]]
	nextVersion: Optional[URI | list[URI]]
	latestVersion: URI | list[URI]
	parentCollections: list[UriResource]
	references: References


@dataclass
class DocObject:
	hash: Sha256Sum
	accessUrl: Optional[URI]
	pid: Optional[str]
	doi: Optional[str]
	fileName: str
	size: Optional[int]
	description: Optional[str]
	submission: DataSubmission
	previousVersion: Optional[URI | list[URI]]
	nextVersion: Optional[URI | list[URI]]
	latestVersion: URI | list[URI]
	parentCollections: list[UriResource]
	references: References


@dataclass
class Licence:
	url: URI
	name: str
	webpage: URI
	baseLicence: Optional[URI]


@dataclass
class References:
	citationString: Optional[str]
	citationBibTex: Optional[str]
	citationRis: Optional[str]
	doi: Optional[DoiMeta]
	keywords: Optional[list[str]]
	authors: Optional[list[Agent]]
	title: Optional[str]
	temporalCoverageDisplay: Optional[str]
	acknowledgements: Optional[list[str]]
	licence: Optional[Licence]


Agent: TypeAlias = Organization | Person

StaticObject: TypeAlias = DataObject | DocObject

FunderIdType: TypeAlias = Literal["Crossref Funder ID" , "GRID" , "ISNI" , "ROR" , "Other"]

IcosStationClass: TypeAlias = Literal["1" , "2" , "Associated"]

@dataclass
class Station:
	org: Organization
	id: str
	location: Optional[Position]
	coverage: Optional[GeoFeature]
	responsibleOrganization: Optional[Organization]
	pictures: list[URI]
	specificInfo: StationSpecifics
	countryCode: Optional[CountryCode]
	funding: Optional[list[Funding]]


@dataclass
class Funding:
	self: UriResource
	funder: Funder
	awardTitle: Optional[str]
	awardNumber: Optional[str]
	awardUrl: Optional[URI]
	start: Optional[LocalDate]
	stop: Optional[LocalDate]


@dataclass
class Funder:
	org: Organization
	id: Optional[tuple[str, FunderIdType]]


NoStationSpecifics: TypeAlias = None

@dataclass
class SitesStationSpecifics:
	sites: list[Site]
	ecosystems: list[UriResource]
	climateZone: Optional[UriResource]
	meanAnnualTemp: Optional[float]
	operationalPeriod: Optional[str]
	documentation: list[PlainStaticObject]


@dataclass
class AtcStationSpecifics:
	wigosId: Optional[str]
	theme: Optional[DataTheme]
	stationClass: Optional[IcosStationClass]
	labelingDate: Optional[LocalDate]
	discontinued: bool
	timeZoneOffset: Optional[int]
	documentation: list[PlainStaticObject]


@dataclass
class OtcStationSpecifics:
	theme: Optional[DataTheme]
	stationClass: Optional[IcosStationClass]
	labelingDate: Optional[LocalDate]
	discontinued: bool
	timeZoneOffset: Optional[int]
	documentation: list[PlainStaticObject]


@dataclass
class EtcStationSpecifics:
	theme: Optional[DataTheme]
	stationClass: Optional[IcosStationClass]
	labelingDate: Optional[LocalDate]
	discontinued: bool
	climateZone: Optional[UriResource]
	ecosystemType: Optional[UriResource]
	meanAnnualTemp: Optional[float]
	meanAnnualPrecip: Optional[float]
	meanAnnualRad: Optional[float]
	stationDocs: list[URI]
	stationPubs: list[URI]
	timeZoneOffset: Optional[int]
	documentation: list[PlainStaticObject]


@dataclass
class IcosCitiesStationSpecifics:
	timeZoneOffset: Optional[int]


EcoStationSpecifics: TypeAlias = SitesStationSpecifics | EtcStationSpecifics

IcosStationSpecifics: TypeAlias = AtcStationSpecifics | OtcStationSpecifics | EtcStationSpecifics

StationSpecifics: TypeAlias = NoStationSpecifics | EcoStationSpecifics | IcosStationSpecifics | IcosCitiesStationSpecifics

@dataclass
class InstrumentDeployment:
	instrument: UriResource
	station: Organization
	pos: Optional[Position]
	variableName: Optional[str]
	forProperty: Optional[UriResource]
	start: Optional[Instant]
	stop: Optional[Instant]


@dataclass
class Instrument:
	self: UriResource
	model: str
	serialNumber: str
	name: Optional[str]
	vendor: Optional[Organization]
	owner: Optional[Organization]
	parts: list[UriResource]
	partOf: Optional[UriResource]
	deployments: list[InstrumentDeployment]


DatasetType: TypeAlias = Literal["StationTimeSeries" , "SpatioTemporal"]


CPJson = TypeVar('CPJson')

def parse_cp_json(input_text: str, data_class: Type[CPJson]) -> CPJson:
	def tuple_hook(d: dict[str, Any]) -> Any:
		for k in d.keys():
			if isinstance(d[k], list):
					d[k] = tuple(d[k])

		return d

	input_dict=json.JSONDecoder(object_hook=tuple_hook).decode(input_text)

	return from_dict(data_class=data_class, data=input_dict, config=Config(cast=[list]))
