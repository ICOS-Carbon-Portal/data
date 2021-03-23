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
import {Documentation, HelpStorageListEntry, HelpItem, HelpItemName} from "../models/HelpStorage";
import {Int} from "../types";
import {saveToRestheart} from "../../../common/main/backend";
import {QueryParameters, SearchOption} from "./types";
import {failWithError} from "./common";
import {DataObjectSpec} from "../../../common/main/metacore";
import {FilterNumber} from "../models/FilterNumbers";
import keywordsInfo from "../backend/keywordsInfo";
import Paging from "../models/Paging";
import { listFilteredDataObjects, SPECCOL } from '../sparqlQueries';
import { sparqlFetchBlob } from "../backend";


const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export const getOriginsThenDobjList: PortalThunkAction<void> = getDobjOriginsAndCounts(true);

function getDobjOriginsAndCounts(fetchObjListWhenDone: boolean): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const filters = getFilters(getState(), true);

		fetchDobjOriginsAndCounts(filters).then(
			dobjOriginsAndCounts => {

				dispatch(new Payloads.BackendOriginsTable(dobjOriginsAndCounts, true));

				if(fetchObjListWhenDone) dispatch(getFilteredDataObjects);

			},
			failWithError(dispatch)
		);

	};
}

const getFilteredDataObjects: PortalThunkAction<void>  = (dispatch, getState) => {
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

	dispatch(new Payloads.BootstrapRouteSearch());

	logPortalUsage(state);
};

const getOptions = (state: State, customPaging?: Paging): QueryParameters => {
	const { specTable, paging, sorting } = state;
	const filters = getFilters(state);
	const useOnlyPidFilter = filters.some(f => f.category === "pids");

	return {
		specs: useOnlyPidFilter ? null : specTable.basics.getDistinctColValues(SPECCOL),
		stations: useOnlyPidFilter ? null : specTable.getFilter('station'),
		sites: useOnlyPidFilter ? null : specTable.getColumnValuesFilter('site'),
		submitters: useOnlyPidFilter ? null : specTable.getFilter('submitter'),
		sorting,
		paging: customPaging ?? paging,
		filters
	};
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

	const effectiveFilterPids = isPidFreeTextSearch(state.tabs, state.filterPids) ? state.filterPids : [];
	const categNames = Object.keys(filterCategories) as Array<keyof typeof filterCategories>;

	if (categNames.length || filterTemporal.hasFilter || filterNumbers.hasFilters || filterKeywords.length > 0 || effectiveFilterPids.length > 0) {

		const filters = categNames.reduce<any>((acc, columnName) => {
			acc[columnName] = specTable.getFilter(columnName);
			return acc;
		}, {});

		if (filterTemporal.hasFilter) filters.filterTemporal = filterTemporal.serialize;
		if (filterNumbers.hasFilters) filters.filterNumbers = filterNumbers.serialize;
		if (effectiveFilterPids.length > 0) filters.filterPids = effectiveFilterPids;
		if (filterKeywords.length > 0) filters.filterKeywords = filterKeywords;
		filters.searchOptions = searchOptions;

		saveToRestheart({
			filterChange: {
				filters
			}
		});
	}
};

function getFilters(state: State, forStatCountsQuery: boolean = false): FilterRequest[] {
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
			const titles = specTable.getColumnValuesFilter('varTitle')
			if(titles != null){
				filters.push({category:'variableNames', names: titles.filter(Value.isString)})
			}
		}

		if(filterKeywords.length > 0){
			const dobjKeywords = filterKeywords.filter(kw => keywords.dobjKeywords.includes(kw));
			const kwSpecs = keywordsInfo.lookupSpecs(keywords, filterKeywords);
			let specs = kwSpecs;

			if(!forStatCountsQuery){
				const specsFilt = specTable.basics.getDistinctColValues(SPECCOL);
				specs = (Filter.and([kwSpecs, specsFilt]) || []).filter(Value.isString);
			};

			filters.push({category: 'keywords', dobjKeywords, specs});
		}

		filters = filters.concat(filterNumbers.validFilters);
	}

	return filters;
};

const varNameAffectingCategs: ReadonlyArray<ColNames> = ['variable', 'valType'];

function varNamesAreFiltered(specTable: CompositeSpecTable): boolean{
	return varNameAffectingCategs.some(cat => specTable.getFilter(cat) !== null);
}

export function specFilterUpdate(varName: ColNames, values: Value[]): PortalThunkAction<void> {
	return (dispatch) => {
		const filter: Filter = values.length === 0 ? null : values;
		dispatch(new Payloads.BackendUpdateSpecFilter(varName, filter));

		if(varNameAffectingCategs.includes(varName)) dispatch(getOriginsThenDobjList)
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
	const {filterTemporal, filterNumbers, specTable, filterKeywords} = getState();
	const shouldRefetchCounts = filterTemporal.hasFilter || filterNumbers.hasFilters || varNamesAreFiltered(specTable) || filterKeywords.length > 0;

	dispatch(new Payloads.MiscResetFilters());
	if(shouldRefetchCounts) dispatch(getOriginsThenDobjList)
	else dispatch(getFilteredDataObjects);
};

export function updateSelectedPids(selectedPids: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersUpdatePids(selectedPids));
		dispatch(getFilteredDataObjects);
	};
}

export function updateCheckedObjectsInSearch(checkedObjectInSearch: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateCheckedObjsInSearch(checkedObjectInSearch));
	};
}

// TODO: selectedTabId can be both string and number. Pick one or the other.
export function switchTab(tabName: string, selectedTabId: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		dispatch(new Payloads.UiSwitchTab(tabName, selectedTabId));

		if (tabName === 'searchTab' && getState().filterPids.length > 0){
			dispatch(getFilteredDataObjects);
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

export function setKeywordFilter(filterKeywords: string[], reset: boolean = false): PortalThunkAction<void> {
	return (dispatch) => {
		if (reset) {
			dispatch(new Payloads.MiscResetFilters());
		}
		dispatch(new Payloads.FilterKeywords(filterKeywords));
		dispatch(getOriginsThenDobjList);
	};
}

export function getFilterHelpInfo(name: HelpItemName): PortalThunkAction<void> {
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
					// The request from backend contains 'uri' since a Query requires at least one mandatory field
					const resourceInfo: HelpStorageListEntry[] = resourceInfoRaw.map(r => ({
						label: r.label as string | Int,
						comment: r.comment as string,
						webpage: r.webpage as UrlStr | undefined
					}));
					dispatch(new Payloads.UiUpdateHelpInfo(helpItem.withList(resourceInfo)))
				}, failWithError(dispatch));
			} else {
				dispatch(new Payloads.UiUpdateHelpInfo(helpItem))
			}
		} else {
			dispatch(new Payloads.UiUpdateHelpInfo(helpItem))
		}
	};
}

export function getResourceHelpInfo(name: HelpItemName, url: UrlStr): PortalThunkAction<void> {
	type HelpInfo = {
		comments: string[]
		label: string
		uri: string
		documentation?: Documentation[]
	}

	const getHelpInfo = (resp: DataObjectSpec): HelpInfo => {
		const res = resp.self;
		const documentation: Documentation[] = resp.documentation.map(doc => ({
			txt: doc.name,
			url: doc.res
		}));

		return {
			comments: res.comments,
			label: res.label ?? '',
			uri: url,
			documentation
		}
	};

	return (dispatch, getState) => {
		const helpItem = getState().helpStorage.getHelpItem(url);
		if(helpItem){
			dispatch(new Payloads.UiUpdateHelpInfo(helpItem));
			return;
		}

		const correctedUrl = new URL(url);
		correctedUrl.protocol = "https:";

		fetchJson<DataObjectSpec | HelpInfo>(correctedUrl.href).then(
			resp => {
				const helpInfo: HelpInfo = resp.documentation === undefined
					? resp as HelpInfo
					: getHelpInfo(resp as DataObjectSpec);

				const helpItem = new HelpItem(name, helpInfo.label, url, helpInfo.comments.map(comment => { return { comment }; }), helpInfo.documentation);

				dispatch(new Payloads.UiUpdateHelpInfo(helpItem));
			},
			failWithError(dispatch)
		)
	};
}

export function updateSearchOption(searchOption: SearchOption): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {searchOptions, tabs, filterPids} = getState();

		dispatch(new Payloads.MiscUpdateSearchOption(searchOption));

		const mustFetchObjs = !isPidFreeTextSearch(tabs, filterPids);
		const mustFetchCounts = (searchOption.name === 'showDeprecated') && (searchOption.value !== searchOptions.showDeprecated);

		if(mustFetchCounts) dispatch(getDobjOriginsAndCounts(mustFetchObjs))
		else if (mustFetchObjs) dispatch(getFilteredDataObjects);
	};
}
