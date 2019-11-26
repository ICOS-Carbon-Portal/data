import {MiscError, MiscInit, MiscPayload, MiscUpdateSearchOption, MiscResetFilters,
	MiscUpdatePaging} from "./actionpayloads";
import stateUtils, {SearchOptions, State} from "../models/State";
import * as Toaster from 'icos-cp-toaster';
import {SearchOption} from "../actions";
import {getObjCount} from "./utils";
import Paging from "../models/Paging";
import FilterTemporal from "../models/FilterTemporal";

export default function(state: State, payload: MiscPayload): State{

	if (payload instanceof MiscInit){
		return stateUtils.update(state, stateUtils.getStateFromHash());
	}

	if (payload instanceof MiscError){
		return stateUtils.update(state, {
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	if (payload instanceof MiscUpdateSearchOption){
		return stateUtils.update(state, {
			searchOptions: updateSearchOptions(payload.oldSearchOptions, payload.newSearchOption)
		});
	}

	if (payload instanceof MiscResetFilters){
		return stateUtils.update(state, resetFilters(state));
	}

	if (payload instanceof MiscUpdatePaging){
		return stateUtils.update(state, {
			paging: new Paging({objCount: payload.objCount})
		});
	}

	return state;

};

const updateSearchOptions = (oldSearchOptions: SearchOptions, newSearchOption: SearchOption) => {
	return Object.assign({}, oldSearchOptions, {[newSearchOption.name]: newSearchOption.value});
};

const resetFilters = (state: State) => {
	const specTable = state.specTable.withResetFilters();
	const objCount = getObjCount(specTable);
	const filterTemporal = new FilterTemporal();

	return {
		specTable,
		paging: new Paging({objCount}),
		filterCategories: {},
		checkedObjectsInSearch: [],
		filterTemporal
	};
};
