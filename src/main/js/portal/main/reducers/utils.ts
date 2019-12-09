import CompositeSpecTable from "../models/CompositeSpecTable";
import { State } from "../models/State";
import { Value } from "../models/SpecTable";

export function getObjCount(specTable: CompositeSpecTable): number {
	return specTable.origins.filteredRows.reduce((acc, next) => acc + toNumber(next.count), 0)
}

export function isPidFreeTextSearch(tabs: State['tabs'], filterPids: State['filterPids']): boolean {
	return tabs.searchTab === 1  && filterPids.length > 0;
}

function toNumber(v: Value): number{
	if(v === undefined) return 0;
	if(typeof v === 'string') return parseInt(v);
	return v
}
