import {PortalThunkAction} from "../store";
import {Filter, Value} from "../models/SpecTable";
import {State} from "../models/State";
import {DeprecatedFilterRequest, FilterRequest, PidFilterRequest, TemporalFilterRequest} from "../models/FilterRequest";
import * as Payloads from "../reducers/actionpayloads";
import {isPidFreeTextSearch} from "../reducers/utils";
import config from "../config";
import {CachedDataObjectsFetcher, DataObjectsFetcher} from "../CachedDataObjectsFetcher";
import {failWithError, fetchExtendedDataObjInfo} from "./main";
import {fetchDobjOriginsAndCounts, fetchResourceHelpInfo} from "../backend";
import {ColNames} from "../models/CompositeSpecTable";
import {Sha256Str, UrlStr} from "../backend/declarations";
import {FiltersUpdatePids} from "../reducers/actionpayloads";
import FilterTemporal from "../models/FilterTemporal";
import {FiltersTemporal} from "../reducers/actionpayloads";
import {HelpStorageListEntry, Item} from "../models/HelpStorage";
import {Int} from "../types";
import {saveToRestheart} from "../../../common/main/backend";
import {Options, SearchOption} from "./types";


const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export default function bootstrapSearch(fetchOriginsTable: boolean): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(fetchFilteredDataObjects(fetchOriginsTable));
	};
}

function fetchFilteredDataObjects(fetchOriginsTable: boolean): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		const {specTable, paging, sorting} = state;
		const filters = getFilters(state);
		const useOnlyPidFilter = filters.some(f => f.category === "pids");

		const options: Options = {
			specs: useOnlyPidFilter ? null : specTable.getSpeciesFilter(null, true),
			stations: useOnlyPidFilter ? null : specTable.getFilter('station'),
			submitters: useOnlyPidFilter ? null : specTable.getFilter('submitter'),
			sorting,
			paging,
			filters
		};

		dataObjectsFetcher.fetch(options).then(
			({rows, cacheSize, isDataEndReached}) => {
				dispatch(fetchExtendedDataObjInfo(rows.map((d) => d.dobj)));
				dispatch(new Payloads.BackendObjectsFetched(rows, isDataEndReached));
			},
			failWithError(dispatch)
		).then(() => {
			if (fetchOriginsTable) dispatch(getOriginsTable);
		});

		logPortalUsage(state);
	};
}

const logPortalUsage = (state: State) => {
	const {specTable, filterCategories, filterTemporal, searchOptions} = state;

	const effectiveFilterPids = isPidFreeTextSearch(state.tabs, state.filterPids) ? state.filterPids : [];
	const categNames = Object.keys(filterCategories) as Array<keyof typeof filterCategories>;

	if (categNames.length || filterTemporal.hasFilter || effectiveFilterPids.length > 0) {

		const filters = categNames.reduce<any>((acc, columnName) => {
			acc.columnName = specTable.getLabelFilter(columnName);
			return acc;
		}, {});

		if (filterTemporal.hasFilter) filters.filterTemporal = filterTemporal.serialize;
		if (effectiveFilterPids.length > 0) filters.filterPids = effectiveFilterPids;
		filters.searchOptions = searchOptions;

		saveToRestheart({
			filterChange: {
				filters
			}
		});
	}
};

const getFilters = (state: State) => {
	const {tabs, filterTemporal, filterPids, searchOptions} = state;
	let filters: FilterRequest[] = [];

	if (isPidFreeTextSearch(tabs, filterPids)){
		filters.push({category: 'deprecated', allow: true} as DeprecatedFilterRequest);
		filters.push({category: 'pids', pids: filterPids} as PidFilterRequest);
	} else {
		filters.push({category: 'deprecated', allow: searchOptions.showDeprecated} as DeprecatedFilterRequest);

		if (filterTemporal.hasFilter){
			filters = filters.concat(filterTemporal.filters as TemporalFilterRequest[]);
		}
	}

	return filters;
};

const getOriginsTable: PortalThunkAction<void> = (dispatch, getState) => {
	const filters = getFilters(getState());

	fetchDobjOriginsAndCounts(filters).then(dobjOriginsAndCounts => {
			dispatch(new Payloads.BackendOriginsTable(dobjOriginsAndCounts));
		},
		failWithError(dispatch)
	);
};

export function specFilterUpdate(varName: ColNames, values: Value[]): PortalThunkAction<void> {
	return (dispatch) => {
		const filter: Filter = values.length === 0 ? null : values;
		dispatch(new Payloads.BackendUpdateSpecFilter(varName, filter));
		dispatch(fetchFilteredDataObjects(false));
	};
}

export function toggleSort(varName: string): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiToggleSorting(varName));
		dispatch(fetchFilteredDataObjects(false));
	};
}

export function requestStep(direction: -1 | 1): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiStepRequested(direction));
		dispatch(fetchFilteredDataObjects(false));
	};
}

export const filtersReset: PortalThunkAction<void> = (dispatch, getState) => {
	const shouldRefetchCounts = getState().filterTemporal.hasFilter;

	dispatch(new Payloads.MiscResetFilters());
	dispatch(fetchFilteredDataObjects(shouldRefetchCounts));
};

export function updateSelectedPids(selectedPids: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersUpdatePids(selectedPids));
		dispatch(fetchFilteredDataObjects(false));
	};
}

export function updateCheckedObjectsInSearch(checkedObjectInSearch: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateCheckedObjsInSearch(checkedObjectInSearch));
	};
}

export function switchTab(tabName: string, selectedTabId: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		dispatch(new Payloads.UiSwitchTab(tabName, selectedTabId));

		if (tabName === 'searchTab' && getState().filterPids.length > 0){
			dispatch(fetchFilteredDataObjects(false));
		}
	};
}

export function setFilterTemporal(filterTemporal: FilterTemporal): PortalThunkAction<void> {
	return (dispatch, getState) => {
		if (filterTemporal.dataTime.error) {
			failWithError(dispatch)(new Error(filterTemporal.dataTime.error));
		}
		if (filterTemporal.submission.error) {
			failWithError(dispatch)(new Error(filterTemporal.submission.error));
		}

		dispatch(new FiltersTemporal(filterTemporal));

		if (filterTemporal.dataTime.error || filterTemporal.submission.error) return;

		const filters = getFilters(getState());

		fetchDobjOriginsAndCounts(filters).then(dobjOriginsAndCounts => {
			dispatch(new Payloads.BackendOriginsTable(dobjOriginsAndCounts));
			dispatch(fetchFilteredDataObjects(false));
		}, failWithError(dispatch));

	};
}

export function getResourceHelpInfo(helpItem: Item): PortalThunkAction<void> {
	return (dispatch, getState) => {
		if (helpItem.shouldFetchList) {
			const {specTable} = getState();
			const uriList = specTable
				.getAllDistinctAvailableColValues(helpItem.name as ColNames)
				.filter(uri => uri);

			if (uriList.length) {
				fetchResourceHelpInfo(uriList).then(resourceInfoRaw => {
					// The request from backend contains 'uri' since a Query requires at least one mandatory field
					const resourceInfo: HelpStorageListEntry[] = resourceInfoRaw.map(r => ({
						label: r.label as string | Int,
						comment: r.comment as string,
						webpage: r.webpage as UrlStr | undefined
					}));
					dispatch(updateHelpInfo(helpItem.withList(resourceInfo)));
				}, failWithError(dispatch));
			} else {
				dispatch(updateHelpInfo(helpItem));
			}
		} else {
			dispatch(updateHelpInfo(helpItem));
		}
	};
}

function updateHelpInfo(helpItem: Item): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateHelpInfo(helpItem));
	};
}

export function updateSearchOption(searchOption: SearchOption): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {searchOptions, tabs, filterPids} = getState();

		dispatch(new Payloads.MiscUpdateSearchOption(searchOption));

		const mustFetchObjs = !isPidFreeTextSearch(tabs, filterPids);
		const mustFetchCounts = (searchOption.name === 'showDeprecated') && (searchOption.value !== searchOptions.showDeprecated);

		if (mustFetchObjs)
			dispatch(fetchFilteredDataObjects(mustFetchCounts));
		else if (mustFetchCounts)
			dispatch(getOriginsTable);
	};
}
