import {MiscError, MiscInit, MiscPayload, MiscUpdateSearchOption, MiscResetFilters, MiscRestoreFromHistory,
	MiscLoadError, MiscRestoreFilters} from "./actionpayloads";
import stateUtils, {FilterCategories, SearchOptions, State} from "../models/State";
import * as Toaster from 'icos-cp-toaster';
import {SearchOption} from "../actions";
import {getObjCount} from "./utils";
import Paging from "../models/Paging";
import FilterTemporal from "../models/FilterTemporal";
import config, {placeholders} from "../config";
import CompositeSpecTable, {BasicsColNames, ColumnMetaColNames, OriginsColNames} from "../models/CompositeSpecTable";

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
		return stateUtils.update(state, {
			searchOptions: updateSearchOptions(payload.oldSearchOptions, payload.newSearchOption)
		});
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

const restoreFilters = (state: State) => {
	const {filterCategories, page} = state;
	const specTable = getSpecTable(state.specTable, filterCategories);
	const objCount = getObjCount(specTable);
	const paging = new Paging({objCount, offset: page * config.stepsize});

	return {
		specTable,
		objectsTable: [],
		paging
	};
};

const specTableKeys = Object.keys(placeholders[config.envri]);

const getSpecTable = (startTable: CompositeSpecTable, filterCategories: FilterCategories) => {
	return Object.keys(filterCategories).reduce((specTable, varName) => {
		return specTableKeys.includes(varName)
			? specTable.withFilter(varName as BasicsColNames | ColumnMetaColNames | OriginsColNames, filterCategories[varName])
			: specTable;
	}, startTable);
};
