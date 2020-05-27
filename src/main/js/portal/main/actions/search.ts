import {PortalThunkAction} from "../store";
import {Filter, Value} from "../models/SpecTable";
import {State} from "../models/State";
import {FilterRequest} from "../models/FilterRequest";
import * as Payloads from "../reducers/actionpayloads";
import {isPidFreeTextSearch} from "../reducers/utils";
import config from "../config";
import {CachedDataObjectsFetcher, DataObjectsFetcher} from "../CachedDataObjectsFetcher";
import {fetchDobjOriginsAndCounts, fetchResourceHelpInfo, getExtendedDataObjInfo, fetchJson} from "../backend";
import CompositeSpecTable, {ColNames} from "../models/CompositeSpecTable";
import {Sha256Str, UrlStr} from "../backend/declarations";
import {FiltersNumber, FiltersUpdatePids} from "../reducers/actionpayloads";
import FilterTemporal from "../models/FilterTemporal";
import {FiltersTemporal} from "../reducers/actionpayloads";
import {Documentation, HelpStorageListEntry, Item, ItemExtended} from "../models/HelpStorage";
import {Int} from "../types";
import {saveToRestheart} from "../../../common/main/backend";
import {QueryParameters, SearchOption} from "./types";
import {failWithError} from "./common";
import {DataObjectSpec} from "../../../common/main/metacore";
import {FilterNumber} from "../models/FilterNumbers";
import keywordsInfo from "../backend/keywordsInfo";


const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export const getOriginsThenDobjList: PortalThunkAction<void> = getDobjOriginsAndCounts(true);

function getDobjOriginsAndCounts(fetchObjListWhenDone: boolean): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const filters = getFilters(getState());

		fetchDobjOriginsAndCounts(filters).then(
			dobjOriginsAndCounts => {

				dispatch(new Payloads.BackendOriginsTable(dobjOriginsAndCounts, true));

				if(fetchObjListWhenDone) dispatch(fetchFilteredDataObjects);

			},
			failWithError(dispatch)
		);

	};
}

const fetchFilteredDataObjects: PortalThunkAction<void>  = (dispatch, getState) => {
	const state = getState();
	const {specTable, paging, sorting} = state;
	const filters = getFilters(state);
	const useOnlyPidFilter = filters.some(f => f.category === "pids");

	const options: QueryParameters = {
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
	);

	dispatch(new Payloads.BootstrapRouteSearch());

	logPortalUsage(state);
};


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
	const {specTable, filterCategories, filterTemporal, searchOptions} = state;

	const effectiveFilterPids = isPidFreeTextSearch(state.tabs, state.filterPids) ? state.filterPids : [];
	const categNames = Object.keys(filterCategories) as Array<keyof typeof filterCategories>;

	if (categNames.length || filterTemporal.hasFilter || effectiveFilterPids.length > 0) {

		const filters = categNames.reduce<any>((acc, columnName) => {
			acc.columnName = specTable.getFilter(columnName);
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
	const {tabs, filterTemporal, filterPids, filterNumbers, filterKeywords, searchOptions, specTable, keywords} = state;
	let filters: FilterRequest[] = [];

	if (isPidFreeTextSearch(tabs, filterPids)){
		filters.push({category: 'deprecated', allow: true});
		filters.push({category: 'pids', pids: filterPids});
	} else {
		filters.push({category: 'deprecated', allow: searchOptions.showDeprecated});

		if (filterTemporal.hasFilter){
			filters = filters.concat(filterTemporal.filters);
		}

		if(varNamesAreFiltered(specTable)){
			const titles = specTable.getColumnValuesFilter('colTitle')
			if(titles != null){
				filters.push({category:'variableNames', names: titles.filter(Value.isString)})
			}
		}

		if(filterKeywords.length > 0){
			const dobjKeywords = filterKeywords.filter(kw => keywords.dobjKeywords.includes(kw));
			const specs = keywordsInfo.lookupSpecs(keywords, filterKeywords);
			filters.push({category: 'keywords', dobjKeywords, specs});
		}

		filters = filters.concat(filterNumbers.validFilters);
	}

	return filters;
};

const varNameAffectingCategs: ReadonlyArray<ColNames> = ['column', 'valType'];

function varNamesAreFiltered(specTable: CompositeSpecTable): boolean{
	return varNameAffectingCategs.some(cat => specTable.getFilter(cat) !== null);
}

export function specFilterUpdate(varName: ColNames, values: Value[]): PortalThunkAction<void> {
	return (dispatch) => {
		const filter: Filter = values.length === 0 ? null : values;
		dispatch(new Payloads.BackendUpdateSpecFilter(varName, filter));

		if(varNameAffectingCategs.includes(varName)) dispatch(getOriginsThenDobjList)
		else dispatch(fetchFilteredDataObjects);
	};
}

export function toggleSort(varName: string): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiToggleSorting(varName));
		dispatch(fetchFilteredDataObjects);
	};
}

export function requestStep(direction: -1 | 1): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiStepRequested(direction));
		dispatch(fetchFilteredDataObjects);
	};
}

export const filtersReset: PortalThunkAction<void> = (dispatch, getState) => {
	const {filterTemporal, filterNumbers, specTable} = getState();
	const shouldRefetchCounts = filterTemporal.hasFilter || filterNumbers.hasFilters || varNamesAreFiltered(specTable);

	dispatch(new Payloads.MiscResetFilters());
	if(shouldRefetchCounts) dispatch(getOriginsThenDobjList)
	else dispatch(fetchFilteredDataObjects);
};

export function updateSelectedPids(selectedPids: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersUpdatePids(selectedPids));
		dispatch(fetchFilteredDataObjects);
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
			dispatch(fetchFilteredDataObjects);
		}
	};
}

export function setFilterTemporal(filterTemporal: FilterTemporal): PortalThunkAction<void> {
	return (dispatch) => {
		if (filterTemporal.dataTime.error) {
			failWithError(dispatch)(new Error(filterTemporal.dataTime.error));
		}
		if (filterTemporal.submission.error) {
			failWithError(dispatch)(new Error(filterTemporal.submission.error));
		}

		dispatch(new FiltersTemporal(filterTemporal));

		if (filterTemporal.dataTime.error || filterTemporal.submission.error) return;

		dispatch(getOriginsThenDobjList);
	};
}

export function setNumberFilter(numberFilter: FilterNumber): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersNumber(numberFilter));
		dispatch(getOriginsThenDobjList);
	};
}

export function setKeywordFilter(filterKeywords: string[]): PortalThunkAction<void> {
	return (dispatch) => {

	};
}

export function getResourceHelpInfo(name: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {helpStorage} = getState();
		const helpItem = helpStorage.getHelpItem(name);

		if (helpItem === undefined) return;

		if (helpItem.shouldFetchList) {
			const {specTable} = getState();
			const uriList = specTable
				.getAllDistinctAvailableColValues(helpItem.name as ColNames)
				.filter(Value.isString);

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

export function getObjectHelpInfo(name: string, header: string, url: UrlStr): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {helpStorage} = getState();
		const helpItemName = url;

		if (helpStorage.has(helpItemName)){
			const helpItem = helpStorage.getHelpItem(helpItemName);
			if (helpItem) dispatch(updateHelpInfo(helpItem));

		} else {
			const correctedUrl = new URL(url);
			correctedUrl.protocol = "https:";

			fetchJson<DataObjectSpec>(correctedUrl.href).then((resp?: DataObjectSpec) => {
				if (resp) {
					const main = resp.self.label ?? '';
					const list = resp.self.comments.map(comment => ({
						txt: comment ?? resp.self.label
					}));
					const documentation: Documentation[] = resp.documentation.map(doc => ({
						txt: doc.name,
						url: doc.res
					}));
					const helpItem = new ItemExtended(helpItemName, header, main, list, documentation);

					dispatch(addHelpInfo(helpItem));
				}
			}, failWithError(dispatch))
		}
	};
}

function addHelpInfo(helpItem: Item): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiAddHelpInfo(helpItem));
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

		if(mustFetchCounts) dispatch(getDobjOriginsAndCounts(mustFetchObjs))
		else if (mustFetchObjs) dispatch(fetchFilteredDataObjects);
	};
}
