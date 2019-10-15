import CompositeSpecTable from "../models/CompositeSpecTable";
import {KeyAnyVal} from "../backend/declarations";
import {State} from "../models/State";
import config from "../config";

export const getObjCount = (specTable: CompositeSpecTable) => {
	const originsTable = specTable.getTable('origins');

	return originsTable
		? originsTable.filteredRows.reduce((acc: number, next: KeyAnyVal) => acc + (next.count || 0), 0)
		: 0;
};
