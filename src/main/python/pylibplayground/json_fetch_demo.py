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

gary = get_cp_json("https://meta.icos-cp.eu/resources/people/Gary_Lanigan", PersonWithRoles)
