import {type NumberFilterCategories, numberFilterKeys} from "../config";
import {type FilterNumber} from "./FilterNumbers";

export type FilterRequest = PidFilterRequest | TemporalFilterRequest | DeprecatedFilterRequest |
	NumberFilterRequest | VariableFilterRequest | KeywordFilterRequest | GeoFilterRequest;

export type PidFilterRequest = {
	category: "pids"
	pids: string[] | null
};
export type TemporalFilterRequest = {
	category: "dataTime" | "submission"
	from: Date | undefined
	fromDateTimeStr: string | undefined
	to: Date | undefined
	toDateTimeStr: string | undefined
};

export type NumberFilterRequest = {} & FilterNumber;

export type DeprecatedFilterRequest = {
	category: "deprecated"
	allow: boolean
};

export type VariableFilterRequest = {
	category: "variableNames"
	names: string[]
};

export type KeywordFilterRequest = {
	category: "keywords"
	keywords: string[]
};

export type GeoFilterRequest = {
	category: "geo"
	wktGeo: string
};

export function isPidFilter(filter: FilterRequest): filter is PidFilterRequest {
	return filter.category === "pids";
}

export function isTemporalFilter(filter: FilterRequest): filter is TemporalFilterRequest {
	return filter.category === "dataTime" || filter.category === "submission";
}

export function isNumberFilter(filter: FilterRequest): filter is NumberFilterRequest {
	return numberFilterKeys.includes(filter.category as NumberFilterCategories);
}

export function isDeprecatedFilter(filter: FilterRequest): filter is DeprecatedFilterRequest {
	return filter.category === "deprecated";
}

export function isVariableFilter(filter: FilterRequest): filter is VariableFilterRequest {
	return filter.category === "variableNames";
}

export function isKeywordsFilter(filter: FilterRequest): filter is KeywordFilterRequest {
	return filter.category === "keywords";
}

export function isGeoFilter(filter: FilterRequest): filter is GeoFilterRequest {
	return filter.category === "geo";
}
