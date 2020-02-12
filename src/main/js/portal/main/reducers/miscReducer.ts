import {
	MiscError, MiscInit, MiscPayload, MiscUpdateSearchOption, MiscResetFilters, MiscRestoreFromHistory,
	MiscLoadError, MiscRestoreFilters
} from "./actionpayloads";
import stateUtils, {CategFilters, State} from "../models/State";
import * as Toaster from 'icos-cp-toaster';
import {getObjCount} from "./utils";
import Paging from "../models/Paging";
import FilterTemporal from "../models/FilterTemporal";
import config, {CategoryType} from "../config";
import CompositeSpecTable from "../models/CompositeSpecTable";
import {getNewPaging} from "./backendReducer";

export default function(state: State, payload: MiscPayload): State{

	if (payload instanceof MiscInit){
		return stateUtils.update(state, stateUtils.getStateFromHash());
	}

	if (payload instanceof MiscRestoreFromHistory){
		return stateUtils.deserialize(payload.historyState, state.cart);
	}

	if (payload instanceof MiscError){
		return stateUtils.update(state, {
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	if (payload instanceof MiscUpdateSearchOption){
		return stateUtils.update(state, handleMiscUpdateSearchOption(state, payload));
	}

	if (payload instanceof MiscResetFilters){
		return stateUtils.update(state, resetFilters(state));
	}

	if (payload instanceof MiscRestoreFilters){
		return stateUtils.update(state, restoreFilters(state));
	}

	if (payload instanceof MiscLoadError){
		return stateUtils.deserialize(payload.state, payload.cart);
	}

	return state;

};

const handleMiscUpdateSearchOption = (state: State, payload: MiscUpdateSearchOption): Partial<State> => {
	const searchOptions = {...state.searchOptions, ...{[payload.newSearchOption.name]: payload.newSearchOption.value}};

	return {
		searchOptions,
		...getNewPaging(state.paging, state.page, state.specTable, true),
	};
};

const resetFilters = (state: State) => {
	const specTable = state.specTable.withResetFilters();

	return {
		specTable,
		...getNewPaging(state.paging, state.page, specTable, true),
		filterCategories: {},
		filterPids: [],
		checkedObjectsInSearch: [],
		filterTemporal: new FilterTemporal()
	};
};

const restoreFilters = (state: State) => {
	const specTable = getSpecTable(state.specTable, state.filterCategories);
	const objCount = getObjCount(specTable);
	const paging = new Paging({objCount, offset: state.page * config.stepsize});

	return {
		specTable,
		objectsTable: [],
		paging
	};
};


function getSpecTable(startTable: CompositeSpecTable, filterCategories: CategFilters): CompositeSpecTable {

	const categoryTypes: CategoryType[] = Object.keys(filterCategories) as Array<keyof typeof filterCategories>;

	return categoryTypes.reduce(
		(specTable, categType) => {
			const filter = filterCategories[categType];
			return filter === undefined ? specTable : specTable.withFilter(categType, filter)
		},
		startTable
	);
}
