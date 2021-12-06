import {Filter} from "../models/SpecTable";
import {SearchOptions, State} from "../models/State";
import Paging from "../models/Paging";
import {FilterRequest} from "../models/FilterRequest";


export interface QueryParameters {
	specs: Filter
	stations: Filter
	sites: Filter
	submitters: Filter
	sorting: State['sorting']
	paging: Paging
	filters: FilterRequest[]
	countryCodes: Filter
}

export type SearchOption = {
	name: keyof SearchOptions
	value: boolean
}
