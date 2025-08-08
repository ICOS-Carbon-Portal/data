import {type Filter} from "../models/SpecTable";
import {type SearchOptions, type State} from "../models/State";
import type Paging from "../models/Paging";
import {type FilterRequest} from "../models/FilterRequest";


export type QueryParameters = {
	specs: Filter
	stations: Filter
	sites: Filter
	submitters: Filter
	sorting: State["sorting"]
	paging: Paging
	filters: FilterRequest[]
};

export type SearchOption = {
	name: keyof SearchOptions
	value: boolean
};
