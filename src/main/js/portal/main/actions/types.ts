import {Filter} from "../models/SpecTable";
import {SearchOptions, State} from "../models/State";
import Paging from "../models/Paging";
import {FilterRequest} from "../models/FilterRequest";


export interface Options {
	specs: Filter
	stations: Filter
	submitters: Filter
	sorting: State['sorting']
	paging: Paging
	filters: FilterRequest[]
}

export type SearchOption = {
	name: keyof SearchOptions
	value: boolean
}
