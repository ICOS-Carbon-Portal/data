
export type FilterRequest = PidFilterRequest | TemporalFilterRequest | DeprecatedFilterRequest

export interface PidFilterRequest{
	category: "pids"
	pids: string[]
}
export interface TemporalFilterRequest{
	category: "dataTime" | "submission"
	from: Date | undefined
	fromDateTimeStr: string | undefined
	to: Date | undefined
	toDateTimeStr: string | undefined
}

export interface DeprecatedFilterRequest{
	category: "deprecated"
	allow: boolean
}

export function isPidFilter(filter: FilterRequest): filter is PidFilterRequest{
	return filter.category == "pids";
}

export function isTemporalFilter(filter: FilterRequest): filter is TemporalFilterRequest{
	switch(filter.category) {
		case "dataTime": return true;
		case "submission": return true;
		case "pids": return false;
		case "deprecated": return false;
	}
}

export function isDeprecatedFilter(filter: FilterRequest): filter is DeprecatedFilterRequest{
	return filter.category == "deprecated";
}
