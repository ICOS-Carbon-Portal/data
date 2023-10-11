from dataclasses import dataclass
from typing import Optional
from .metacore import UriResource, Person, Organization, Station

@dataclass(frozen=True)
class Role:
    role: UriResource

@dataclass(frozen=True)
class Membership:
    org: UriResource
    role: Role
    startDate: Optional[str]
    endDate: Optional[str]

@dataclass(frozen=True)
class PersonWithRoles(Person):
    roles: list[Membership]

@dataclass(frozen=True)
class Employee:
    person: Person
    role: Role

@dataclass(frozen=True)
class OrgWithStaff(Organization):
    staff: list[Employee]

@dataclass(frozen=True)
class StationWithStaff(Station):
    staff: list[Employee]
