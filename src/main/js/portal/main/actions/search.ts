import {PortalThunkAction} from "../store";
import SpecTable, {Filter, Value} from "../models/SpecTable";
import {State, TabsState, WhoAmI} from "../models/State";
import * as Payloads from "../reducers/actionpayloads";
import {isInPidFilteringMode} from "../reducers/utils";
import config from "../config";
import {CachedDataObjectsFetcher, DataObjectsFetcher} from "../CachedDataObjectsFetcher";
import {
	fetchDobjOriginsAndCounts,
	fetchResourceHelpInfo,
	getExtendedDataObjInfo,
	makeHelpStorageListItem,
	savePersistedMapProps,
	searchDobjByFileName
} from "../backend";
import {ColNames, OriginsColNames} from "../models/CompositeSpecTable";
import {Sha256Str, UrlStr} from "../backend/declarations";
import { FiltersNumber, FiltersUpdatePids, FiltersUpdateFileName, UiInactivateAllHelp} from "../reducers/actionpayloads";
import FilterTemporal from "../models/FilterTemporal";
import {FiltersTemporal} from "../reducers/actionpayloads";
import {HelpStorageListEntry, HelpItem, HelpItemName} from "../models/HelpStorage";
import {saveToRestheart} from "../../../common/main/backend";
import {QueryParameters, SearchOption} from "./types";
import {
	failWithError, fetchCart, getBackendTables,
	getFilters,
	varNameAffectingCategs,
	varNamesAreFiltered
} from "./common";
import {FilterNumber} from "../models/FilterNumbers";
import Paging from "../models/Paging";
import { listFilteredDataObjects } from '../sparqlQueries';
import { sparqlFetchBlob } from "../backend";
import {PersistedMapPropsExtended} from "../models/InitMap";


export default function bootstrapSearch(user: WhoAmI,tabs: TabsState): PortalThunkAction<void> {
	return (dispatch, getState) => {

		const filters = getFilters(getState());
		dispatch(getBackendTables(filters)).then(_ => {
			dispatch(getFilteredDataObjects);
		});

		dispatch(new Payloads.BootstrapRouteSearch());

		dispatch(new UiInactivateAllHelp());

		dispatch(fetchCart(user));
	}
}

const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export const getOriginsThenDobjList: PortalThunkAction<void> = getDobjOriginsAndCounts(true);

function getDobjOriginsAndCounts(fetchObjListWhenDone: boolean): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const filters = getFilters(getState(), true);

		fetchDobjOriginsAndCounts(filters).then(
			dobjOriginsAndCounts => {
				const tbl = new SpecTable<OriginsColNames>(dobjOriginsAndCounts.colNames, dobjOriginsAndCounts.rows, {});
				dispatch(new Payloads.BackendOriginsTable(tbl, true));

				if(fetchObjListWhenDone) dispatch(getFilteredDataObjects);

			},
			failWithError(dispatch)
		);

	};
}

export const getFilteredDataObjects: PortalThunkAction<void>  = (dispatch, getState) => {
	const state = getState();
	const options = getOptions(state);

	const sparqQuery = listFilteredDataObjects(options);
	const sparqClientQuery = makeQuerySubmittable(sparqQuery.text);

	dispatch(new Payloads.BackendExportQuery(false, sparqClientQuery));

	dataObjectsFetcher.fetch(options).then(
		({rows, cacheSize, isDataEndReached}) => {
			dispatch(fetchExtendedDataObjInfo(rows.map((d) => d.dobj)));
			dispatch(new Payloads.BackendObjectsFetched(rows, isDataEndReached));
		},
		failWithError(dispatch)
	);

	logPortalUsage(state);
};

const getOptions = (state: State, customPaging?: Paging): QueryParameters => {
	const { specTable, paging, sorting } = state;
	const filters = getFilters(state);
	const useOnlyPidFilter = filters.some(f => f.category === "pids" && f.pids !== null);

	const pidFilterQparams: QueryParameters = {
		specs: null,
		stations: null,
		sites: null,
		submitters: null,
		sorting,
		paging: customPaging ?? paging,
		filters
	};

	const originsStationFilter: Filter = specTable.origins
		.filteredColumns
		.every(col => col === "submitter" || col === "spec")
			? null
			: specTable.origins.getColumnValuesFilter('station');

	return useOnlyPidFilter ? pidFilterQparams : Object.assign(pidFilterQparams, {
		specs: Filter.and([
			specTable.basics.getColumnValuesFilter("type"),
			specTable.columnMeta.getColumnValuesFilter("spec")
		]),
		stations: originsStationFilter,
		sites: specTable.getColumnValuesFilter('site'),
		submitters: specTable.getFilter('submitter')
	});
};

export const makeQuerySubmittable = (orgQuery: string) => {
	const queryRows = orgQuery.split('\n');
	// Skip rows starting with a comment char and empty rows
	return queryRows
		.filter(row => row.length > 0 && !row.match(/^\s*#/) && !row.match(/^\t+$/))
		.join('\n');
};

export function getAllFilteredDataObjects(): PortalThunkAction<void>{
	return (dispatch, getState) => {
		const state = getState();
		const sparqClientQuery = state.exportQuery.sparqClientQuery;

		dispatch(new Payloads.BackendExportQuery(true, sparqClientQuery));

		const options = getOptions(state, new Paging({ objCount: 0, offset: 0, limit: config.exportCSVLimit }));
		const query = makeQuerySubmittable(listFilteredDataObjects(options).text);

		sparqlFetchBlob(query).then(blob => {
			const lnk = document.createElement("a");
			lnk.href = window.URL.createObjectURL(blob);
			lnk.download = config.searchResultsCSVName[config.envri];
			lnk.click();

			dispatch(new Payloads.BackendExportQuery(false, sparqClientQuery));
		});
	};
}


function fetchExtendedDataObjInfo(dobjs: UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		getExtendedDataObjInfo(dobjs).then(extendedDobjInfo => {
				dispatch(new Payloads.BackendExtendedDataObjInfo(extendedDobjInfo));
			},
			failWithError(dispatch)
		);
	};
}

const logPortalUsage = (state: State) => {
	const {specTable, filterCategories, filterTemporal, filterNumbers, filterKeywords, searchOptions} = state;

	const effectiveFilterPids = isInPidFilteringMode(state.tabs, state.filterPids) ? state.filterPids : [];
	const categNames = Object.keys(filterCategories) as Array<keyof typeof filterCategories>;

	if (categNames.length || filterTemporal.hasFilter || filterNumbers.hasFilters || filterKeywords.length > 0 || effectiveFilterPids !== null) {

		const filters = categNames.reduce<any>((acc, columnName) => {
			acc[columnName] = specTable.getFilter(columnName);
			return acc;
		}, {});

		if (filterTemporal.hasFilter) filters.filterTemporal = filterTemporal.serialize;
		if (filterNumbers.hasFilters) filters.filterNumbers = filterNumbers.serialize;
		if (effectiveFilterPids !== null) filters.filterPids = effectiveFilterPids;
		if (filterKeywords.length > 0) filters.filterKeywords = filterKeywords;
		filters.searchOptions = searchOptions;

		saveToRestheart({
			filterChange: {
				filters
			}
		});
	}
};

export function specFilterUpdate(varName: ColNames | 'keywordFilter', values: Value[]): PortalThunkAction<void> {
	return (dispatch) => {
		const filter: Filter = values.length === 0 ? null : values;

		dispatch(new Payloads.BackendUpdateSpecFilter(varName, filter));

		if (varNameAffectingCategs.includes(varName as ColNames)) dispatch(getOriginsThenDobjList)
		else dispatch(getFilteredDataObjects);
	};
}

export function toggleSort(varName: string): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiToggleSorting(varName));
		dispatch(getFilteredDataObjects);
	};
}

export function requestStep(direction: -1 | 1): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiStepRequested(direction));
		dispatch(getFilteredDataObjects);
	};
}

export const filtersReset: PortalThunkAction<void> = (dispatch, getState) => {
	const {filterTemporal, filterNumbers, specTable, filterKeywords, mapProps} = getState();
	const shouldRefetchCounts = filterTemporal.hasFilter
		|| filterNumbers.hasFilters
		|| varNamesAreFiltered(specTable)
		|| filterKeywords.length > 0
		|| (!!(mapProps.rects) && mapProps.rects.length > 0)

	dispatch(new Payloads.MiscResetFilters());

	if (shouldRefetchCounts)
		dispatch(getOriginsThenDobjList)
	else
		dispatch(getFilteredDataObjects);
};

export function updateSelectedPids(selectedPids: Sha256Str[] | null): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersUpdatePids(selectedPids));
		dispatch(getFilteredDataObjects);
	};
}

const updatePidsFromFileName: PortalThunkAction<void> = (dispatch, getState) => {
	const { filterFileName } = getState();
	if (filterFileName.length) {
		const { searchOptions } = getState();
		searchDobjByFileName(filterFileName, searchOptions.showDeprecated).then(dobjs => {
			dispatch(updateSelectedPids(dobjs.map(d => d.dobj)));
		});
	} else {
		dispatch(updateSelectedPids(null));
	}
}

export function updateFileName(fileName: string): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersUpdateFileName(fileName));
		dispatch(updatePidsFromFileName);
	};
}

export function updateCheckedObjectsInSearch(checkedObjectInSearch: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateCheckedObjsInSearch(checkedObjectInSearch));
	};
}

export function switchTab(tabName: string, selectedTabId: number): PortalThunkAction<void> {
	return (dispatch, getState) => {
		dispatch(new Payloads.UiSwitchTab(tabName, selectedTabId));

		if (tabName === 'searchTab' && getState().filterPids !== null){
			dispatch(getFilteredDataObjects);
		}

	};
}

export function setMapProps(persistedMapProps: PersistedMapPropsExtended): PortalThunkAction<void> {
	return (dispatch) => {
		savePersistedMapProps(persistedMapProps)
		dispatch(new Payloads.MiscUpdateMapProps(persistedMapProps));
		dispatch(getOriginsThenDobjList);
	};
}

export function setFilterTemporal(filterTemporal: FilterTemporal): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersTemporal(filterTemporal));
		dispatch(getOriginsThenDobjList);
	};
}

export function setNumberFilter(numberFilter: FilterNumber): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersNumber(numberFilter));
		dispatch(getOriginsThenDobjList);
	};
}

export function setKeywordFilter(filterKeywords: string[], reset: boolean = false): PortalThunkAction<void> {
	return (dispatch) => {
		if (reset) {
			dispatch(new Payloads.MiscResetFilters());
		}
		dispatch(new Payloads.FilterKeywords(filterKeywords));
		dispatch(getOriginsThenDobjList);
	};
}

export function getFilterHelpInfo(name: ColNames | HelpItemName): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const helpItem = getState().helpStorage.getHelpItem(name);

		if (helpItem === undefined) {
			dispatch(new Payloads.MiscError(new Error("Could not locate help information for " + name)));

		} else if (helpItem.shouldFetchList) {
			const {specTable} = getState();
			const uriList = specTable
				.getAllDistinctAvailableColValues(helpItem.name as ColNames)
				.filter(Value.isString);

			if (uriList.length) {
				fetchResourceHelpInfo(uriList).then(resourceInfoRaw => {
					const resourceInfo: HelpStorageListEntry[] = resourceInfoRaw.map(makeHelpStorageListItem);
					dispatch(new Payloads.UiUpdateHelpInfo(helpItem.withList(resourceInfo)));
				}, failWithError(dispatch));
			} else {
				dispatch(new Payloads.UiUpdateHelpInfo(helpItem))
			}
		} else {
			dispatch(new Payloads.UiUpdateHelpInfo(helpItem))
		}
	};
}

export type HelpContent = {
	url: string
	main: string
	helpStorageListEntry: HelpStorageListEntry[]
}
export function setFilterHelpInfo(name: ColNames | HelpItemName, helpContent: HelpContent): PortalThunkAction<void> {
	// helpContent is compiled from labelLookup so no need to ask backend
	return (dispatch, getState) => {
		const existingHelpItem = getState().helpStorage.getHelpItem(helpContent.url);

		if (existingHelpItem){
			dispatch(new Payloads.UiUpdateHelpInfo(existingHelpItem));
			return;
		}

		const newHelpItem = new HelpItem(
			name as HelpItemName,
			helpContent.main,
			helpContent.url,
			helpContent.helpStorageListEntry
		);
		dispatch(new Payloads.UiUpdateHelpInfo(newHelpItem));
	};
}

export function updateSearchOption(searchOption: SearchOption): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {searchOptions, tabs, filterPids, filterFileName} = getState();

		dispatch(new Payloads.MiscUpdateSearchOption(searchOption));

		const mustFetchCounts = (searchOption.name === 'showDeprecated') && (searchOption.value !== searchOptions.showDeprecated);
		const mustFetchObjs = !isInPidFilteringMode(tabs, filterPids) || mustFetchCounts;
		const mustFetchPIDs = mustFetchCounts && filterFileName.length;

		if(mustFetchPIDs) dispatch(updatePidsFromFileName)
		else if(mustFetchCounts) dispatch(getDobjOriginsAndCounts(mustFetchObjs))
		else if (mustFetchObjs) dispatch(getFilteredDataObjects);
	};
}
