import CompositeSpecTable from "../models/CompositeSpecTable";
import {KeyAnyVal} from "../backend/declarations";

export const getObjCount = (specTable: CompositeSpecTable): number => {
	const originsTable = specTable.getTable('origins');

	return originsTable
		? originsTable.filteredRows.reduce((acc: number, next: KeyAnyVal) => acc + (next.count || 0), 0)
		: 0;
};
