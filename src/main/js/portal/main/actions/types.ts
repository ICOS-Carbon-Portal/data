import {Filter} from "../models/SpecTable";
import {CategFilters, SearchOptions, State} from "../models/State";
import Paging from "../models/Paging";
import {FilterRequest} from "../models/FilterRequest";


export interface QueryParameters {
	specs: Filter
	stations: Filter
	sites: Filter
	submitters: Filter
	// Raw per-column UI selections, consumed by the query builder to produce a self-contained
	// relational query.
	filterCategories: CategFilters
	sorting: State['sorting']
	paging: Paging
	filters: FilterRequest[]
}

export type SearchOption = {
	name: keyof SearchOptions
	value: boolean
}
