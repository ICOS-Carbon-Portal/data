from requests import get
from metacore import *

def get_cp_json(url: str, data_class: Type[CPJson]) -> CPJson:
	resp = get(url = url, headers={"Accept": "application/json"})
	return parse_cp_json(resp.text, data_class=data_class)

def get_data_object(url: str) -> DataObject:
	return get_cp_json(url, DataObject)

gtfStation = get_cp_json("https://meta.icos-cp.eu/resources/stations/ES_IE-GtF", Station)

gtfId = gtfStation.id

@dataclass
class Role:
	role: UriResource

@dataclass
class Membership:
	org: UriResource
	role: Role
	startDate: Optional[str]
	endDate: Optional[str]

@dataclass
class PersonWithRoles(Person):
	roles: list[Membership]

@dataclass
class Employee:
	person: Person
	role: Role

@dataclass
class OrgWithStaff(Organization):
	staff: list[Employee]

@dataclass
class StationWithStaff(Station):
	staff: list[Employee]


gary = get_cp_json("https://meta.icos-cp.eu/resources/people/Gary_Lanigan", PersonWithRoles)

instr = get_cp_json("https://meta.icos-cp.eu/resources/instruments/ETC_dab17f51-057e-4f96-b967-b11d8d56e9bc", Instrument)

deployments = instr.deployments
model = instr.model

org = get_cp_json("https://meta.icos-cp.eu/resources/organizations/ATC", OrgWithStaff)

# Station time series
tsDobj = get_cp_json("https://meta.icos-cp.eu/objects/Z3k8iBGsFwnQkivriJ6BZgFH", DataObject)

if isinstance(tsDobj.specificInfo, StationTimeSeriesMeta):
	geocov = tsDobj.specificInfo.coverage

# Spatiotemporal metadata
spDobj = get_cp_json("https://meta.icos-cp.eu/objects/GOohD9UclUiztk6VuA_y5MZT", DataObject)

if isinstance(spDobj.specificInfo, SpatioTemporalMeta):
	spcov = spDobj.specificInfo.spatial

stationWithStaff = get_cp_json("https://meta.icos-cp.eu/resources/stations/AS_ZSF", StationWithStaff)
stationWithStaff.staff

coll = get_cp_json("https://meta.icos-cp.eu/collections/unv31HYRKgullLjJ99O5YCsG", StaticCollection)

nbr_of_members = len(coll.members)
lic = coll.references
