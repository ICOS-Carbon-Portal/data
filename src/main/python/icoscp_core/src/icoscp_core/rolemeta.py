from dataclasses import dataclass
from typing import Optional
from .metacore import UriResource, Person, Organization, Station

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
