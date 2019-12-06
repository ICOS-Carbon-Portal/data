import Cart from "./models/Cart";
import stateUtils, {Profile, State, SearchOptions, WhoAmI, ObjectsTable} from "./models/State";
import {
	fetchAllSpecTables,
	getCart,
	saveCart,
	logOut,
	fetchResourceHelpInfo,
	getMetadata,
	fetchKnownDataObjects, fetchDobjOriginsAndCounts, fetchFilteredDataObjects
} from './backend';
import {getIsBatchDownloadOk, getWhoIam, getProfile, getError, getTsSettings, saveTsSetting} from './backend';
import {getExtendedDataObjInfo} from './backend';
import {isPidFreeTextSearch} from './reducers/utils';
import {DataObjectsFetcher, CachedDataObjectsFetcher} from "./CachedDataObjectsFetcher";
import {restoreCarts} from './models/Cart';
import CartItem from './models/CartItem';
import {getNewTimeseriesUrl, getRouteFromLocationHash} from './utils';
import config from './config';
import {saveToRestheart} from "../../common/main/backend";
import {PortalThunkAction, PortalDispatch} from "./store";
import {KeyStrVal, Sha256Str, ThenArg, UrlStr} from "./backend/declarations";
import {Item} from "./models/HelpStorage";
import FilterTemporal from "./models/FilterTemporal";
import {DeprecatedFilterRequest, FilterRequest, PidFilterRequest, TemporalFilterRequest} from "./models/FilterRequest";
import CompositeSpecTable, {ColNames} from "./models/CompositeSpecTable";
import Paging from "./models/Paging";
import * as Payloads from "./reducers/actionpayloads";
import {Value} from "./models/SpecTable";
import {FiltersTemporal, FiltersUpdatePids} from "./reducers/actionpayloads";

const dataObjectsFetcher = config.useDataObjectsCache
	? new CachedDataObjectsFetcher(config.dobjCacheFetchLimit)
	: new DataObjectsFetcher();

export const failWithError: (dispatch: PortalDispatch) => (error: Error) => void = dispatch => error => {
	dispatch(new Payloads.MiscError(error));
	dispatch(logError(error));
};

function logError(error: Error): PortalThunkAction<void> {
	return (_, getState) => {
		const state = getState();
		const user = state.user;
		const profile = user.profile;
		const userName = user.email
			? `${(profile as Profile).givenName} ${(profile as Profile).surname}`
			: undefined;

		saveToRestheart({
			error: {
				app: 'portal',
				message: error.message,
				state: JSON.stringify(Object.assign({}, stateUtils.serialize(state), {
					user: userName,
					cart: state.cart
				})),
				url: decodeURI(window.location.href)
			}
		});
	}
}

export const init: PortalThunkAction<void> = dispatch => {
	const stateFromHash = stateUtils.hashToState();

	getWhoIam().then((user: WhoAmI) => {
		if (stateFromHash.error){
			if (user.email) logOut();
			dispatch(loadFromError(user, stateFromHash.error));

		} else {
			dispatch(loadApp(user));
		}
	});
};

function loadApp(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {
		dispatch(new Payloads.MiscInit());

		type LoggedIn = {_id: string, profile: Profile | {}};

		getProfile(user.email).then((resp: {} | LoggedIn) => {
			const profile = (resp as LoggedIn).profile || {};

			dispatch(new Payloads.BackendUserInfo(user, profile));
			dispatch(getTsPreviewSettings);
		});

		getCart(user.email).then(
			({cartInSessionStorage, cartInRestheart}) => {

				cartInRestheart.then(restheartCart => {
					const cart = restoreCarts(cartInSessionStorage, restheartCart);
					const filters = getFilters(getState());

					dispatch(updateCart(user.email, cart))
						.then(() => dispatch(getAllSpecTables(filters)));
				});
			}
		);
	};
}

function loadFromError(user: WhoAmI, errorId: string): PortalThunkAction<void> {
	return (dispatch) => {
		getError(errorId).then(response => {
			if (response && response.error && response.error.state) {
				const stateJSON = JSON.parse(response.error.state);
				const objectsTable = stateJSON.objectsTable.map((ot: ObjectsTable) => {
					return Object.assign(ot, {
						submTime: new Date(ot.submTime),
						timeStart: new Date(ot.timeStart),
						timeEnd: new Date(ot.timeEnd)
					});
				});
				const cart = restoreCarts({cart: stateJSON.cart}, {cart: new Cart()});
				const state: State = Object.assign({},
					stateJSON,
					{objectsTable, ts: undefined, user: {}}
				);

				dispatch(new Payloads.MiscLoadError(state, cart));

			} else {
				dispatch(loadApp(user));
			}
		});
	};
}

export function restoreFromHistory(historyState: State): PortalThunkAction<void> {
	return (dispatch) => {
		const ts = historyState.ts ?? Date.now();

		if (Date.now() - ts < config.historyStateMaxAge) {
			dispatch(new Payloads.MiscRestoreFromHistory(historyState));
			dispatch(addStateMisingInHistory);
		} else {
			dispatch(init);
		}
	};
}

const addStateMisingInHistory: PortalThunkAction<void> = (dispatch, getState) => {
	const {route, metadata, id} = getState();

	if (route === config.ROUTE_METADATA && metadata && id !== undefined && metadata.id !== id)
		dispatch(setMetadataItem(id));
};

function getAllSpecTables(filters: FilterRequest[]): PortalThunkAction<void> {
	return (dispatch) => {
		fetchAllSpecTables(filters).then(
			allTables => {
				dispatch(new Payloads.BackendTables(allTables));
				dispatch(new Payloads.MiscRestoreFilters());
				dispatch(getFilteredDataObjects(false));
			},
			failWithError(dispatch)
		);
	};
}

const getOriginsTable: PortalThunkAction<void> = (dispatch, getState) => {
	const filters = getFilters(getState());

	fetchDobjOriginsAndCounts(filters).then(dobjOriginsAndCounts => {
			dispatch(new Payloads.BackendOriginsTable(dobjOriginsAndCounts));
		},
		failWithError(dispatch)
	);
};

export function updateSelectedPids(selectedPids: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new FiltersUpdatePids(selectedPids));
		dispatch(getFilteredDataObjects(false));
	};
}

export function updateCheckedObjectsInSearch(checkedObjectInSearch: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateCheckedObjsInSearch(checkedObjectInSearch));
	};
}

export function updateCheckedObjectsInCart(checkedObjectInCart: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateCheckedObjsInCart(checkedObjectInCart));
	};
}

export function specFilterUpdate(varName: ColNames, values: Value[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.BackendUpdateSpecFilter(varName, values));
		dispatch(getFilteredDataObjects(false));
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

export const updateFilteredDataObjects: PortalThunkAction<void> = (dispatch, getState) => {
	const objectsTable = getState().objectsTable;

	if (objectsTable.length === 0) dispatch(getFilteredDataObjects(true));
};

function getKnownDataObjInfo(dobjs: string[], cb?: Function): PortalThunkAction<void> {
	return (dispatch) => {
		fetchKnownDataObjects(dobjs).then(result => {
				dispatch(new Payloads.BackendObjectsFetched(result.rows, result.rows.length, true));

				if (cb) dispatch(cb);
			},
			failWithError(dispatch)
		);
	};
}

const restorePreview: PortalThunkAction<void> = (dispatch) => {
	dispatch(new Payloads.RestorePreview());
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

function getFilteredDataObjects(fetchOriginsTable: boolean): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		const {route, cart, id, preview} = state;

		if (route === config.ROUTE_CART) {
			const cartItems: CartItem[] = cart.items;
			const rows = cartItems.map(ci => ci.item);
			const dobjs = rows.map(r => r.dobj);

			dispatch(fetchExtendedDataObjInfo(dobjs));

			dispatch(new Payloads.BackendObjectsFetched(rows, rows.length, true));

		} else if (route === config.ROUTE_METADATA && id) {
			const hash: Sha256Str | undefined = id.split('/').pop();

			if (hash) {
				dispatch(getKnownDataObjInfo([hash]));
				dispatch(setMetadataItem(id));
			}

		} else if (route === config.ROUTE_PREVIEW && preview.hasPids){
			dispatch(getKnownDataObjInfo(preview.pids, restorePreview));

			let ids = preview.pids.map((id: string) => config.previewIdPrefix[config.envri] + id);
			dispatch(fetchExtendedDataObjInfo(ids));

		} else {
			const {specTable, sorting, paging} = state;
			const formatToRdfGraph: {} & KeyStrVal = state.formatToRdfGraph;
			const filters = getFilters(state);
			const useOnlyPidFilter = filters.some(f => f.category === "pids");

			const options: Options = {
				specs: useOnlyPidFilter ? [] : specTable.getSpeciesFilter(null, true),
				stations: useOnlyPidFilter ? [] : specTable.getFilter('station'),
				submitters: useOnlyPidFilter ? [] : specTable.getFilter('submitter'),
				sorting,
				paging,
				rdfGraphs: useOnlyPidFilter ? [] : specTable.getColumnValuesFilter('format').map((f: Value) => formatToRdfGraph[f!]),
				filters
			};

			interface FetchedDataObj {
				rows: ThenArg<typeof fetchFilteredDataObjects>['rows'],
				cacheSize: number,
				isDataEndReached: boolean
			}

			dataObjectsFetcher.fetch(options).then(
				({rows, cacheSize, isDataEndReached}: FetchedDataObj) => {
					dispatch(fetchExtendedDataObjInfo(rows.map((d) => d.dobj)));
					dispatch(new Payloads.BackendObjectsFetched(rows, cacheSize, isDataEndReached));
				},
				failWithError(dispatch)
			).then(() => {
				if (fetchOriginsTable) dispatch(getOriginsTable);
			});
		}

		if (route === undefined || route === config.ROUTE_SEARCH) {
			logPortalUsage(state);
		}
	};
}

export interface Options {
	specs: ReturnType<typeof CompositeSpecTable.prototype.getSpeciesFilter>
	stations: ReturnType<typeof CompositeSpecTable.prototype.getFilter>
	submitters: ReturnType<typeof CompositeSpecTable.prototype.getFilter>
	sorting: State['sorting']
	paging: Paging
	rdfGraphs: ReturnType<typeof CompositeSpecTable.prototype.getColumnValuesFilter>
	filters: FilterRequest[]
}

function fetchExtendedDataObjInfo(dobjs: string[]): PortalThunkAction<void> {
	return (dispatch) => {
		getExtendedDataObjInfo(dobjs).then(extendedDobjInfo => {
				dispatch(new Payloads.BackendExtendedDataObjInfo(extendedDobjInfo));
			},
			failWithError(dispatch)
		);
	};
}

export const filtersReset: PortalThunkAction<void> = (dispatch, getState) => {
	const shouldRefetchCounts = getState().filterTemporal.hasFilter;
	dispatch(new Payloads.MiscResetFilters());
	dispatch(getFilteredDataObjects(shouldRefetchCounts));
};

export function toggleSort(varName: string): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiToggleSorting(varName));
		dispatch(getFilteredDataObjects(false));
	};
}

export function requestStep(direction: -1 | 1): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiStepRequested(direction));
		dispatch(getFilteredDataObjects(false));
	};
}

export function updateRoute(route: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const newRoute = route || getRouteFromLocationHash() || config.ROUTE_SEARCH;

		dispatch(new Payloads.UiUpdateRoute(route));

		if (newRoute === config.ROUTE_CART && getState().route !== newRoute){
			dispatch(getFilteredDataObjects(true));

		} else if (newRoute === config.ROUTE_SEARCH && getState().route === config.ROUTE_CART){
			dispatch(getFilteredDataObjects(true));
		}
	};
}

export function switchTab(tabName: string, selectedTabId: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		dispatch(new Payloads.UiSwitchTab(tabName, selectedTabId));

		if (tabName === 'searchTab' && getState().filterPids.length > 0){
			dispatch(getFilteredDataObjects(false));
		}
	};
}

export function setMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.BackendObjectMetadataId(id));

		getMetadata(id).then(metadata => {
			const metadataWithId = Object.assign({}, metadata, {id});
			dispatch(new Payloads.BackendObjectMetadata(metadataWithId));
		});
	};
}

export function setPreviewItem(id: UrlStr[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		dispatch(getTsPreviewSettings).then(() => {
			dispatch(new Payloads.SetPreviewFromCart(id));

			if (!getState().preview.items.length) {
				dispatch(fetchExtendedDataObjInfo(id));
			}
		});
	};
}

const getTsPreviewSettings: PortalThunkAction<Promise<any>> = (dispatch, getState) => {
	const user = getState().user;

	return getTsSettings(user.email).then(tsSettings => {
		dispatch(new Payloads.BackendTsSettings(tsSettings));
	});
};

export function storeTsPreviewSetting(spec: string, type: string, val: string): PortalThunkAction<void>{
	return (dispatch, getState) => {
		const user = getState().user;

		saveTsSetting(user.email, spec, type, val).then(tsSettings => {
			dispatch(new Payloads.BackendTsSettings(tsSettings));
		});
	};
}

export function setPreviewUrl(url: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.SetPreviewItem(url));
	};
}

export function setCartName(newName: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();

		dispatch(updateCart(state.user.email, state.cart.withName(newName)));
	};
}

export function addToCart(ids: UrlStr[]): PortalThunkAction<void>{
	return (dispatch, getState) => {
		const state = getState();
		const cart = state.cart;

		const newItems = ids.filter(id => !cart.hasItem(id)).map(id => {
			const objInfo: ObjectsTable | undefined = state.objectsTable.find(o => o.dobj === id);
			if (objInfo === undefined)
				throw new Error(`Could not find objTable with id=${id} in ${state.objectsTable}`);

			const specLookup = state.lookup && objInfo && objInfo.spec
				? state.lookup.getSpecLookup(objInfo.spec)
				: undefined;

//TODO This is unexpected operation to do when adding to cart. Was always resulting in undefined until recently.
			const xAxis = specLookup && specLookup.type === 'TIMESERIES'
				? specLookup.options.find(ao => ao.colTitle === 'TIMESTAMP')?.colTitle
				: undefined;

			const item = new CartItem(objInfo, specLookup?.type);

			return xAxis
				? item.withUrl(getNewTimeseriesUrl([item], xAxis))
				: item;
		});

		if (newItems.length > 0) {
			dispatch(updateCart(state.user.email, cart.addItem(newItems)));
		}
	};
}

export function removeFromCart(ids: UrlStr[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		const cart = state.cart.removeItems(ids);

		dispatch(updateCart(state.user.email, cart));
	};
}

function updateCart(email: string | null, cart: Cart): PortalThunkAction<Promise<any>> {
	return dispatch => saveCart(email, cart).then(() =>
		dispatch(new Payloads.BackendUpdateCart(cart))
	);
}

export const fetchIsBatchDownloadOk: PortalThunkAction<void> = dispatch => {
	Promise.all([getIsBatchDownloadOk(), getWhoIam()])
		.then(([isBatchDownloadOk, user]) =>
			dispatch(new Payloads.BackendBatchDownload(isBatchDownloadOk, user)),
			failWithError(dispatch)
		);
};

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
			dispatch(getFilteredDataObjects(false));
		}, failWithError(dispatch));

	};
}

export function getResourceHelpInfo(helpItem: Item): PortalThunkAction<void> {
	return (dispatch, getState) => {
		if (helpItem.shouldFetchList) {
			const {specTable} = getState();
			const uriList = specTable
				.getAllDistinctAvailableColValues(helpItem.name)
				.filter(uri => uri);

			if (uriList.length) {
				fetchResourceHelpInfo(uriList).then(resourceInfo => {
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

export type SearchOption = {
	name: keyof SearchOptions
	value: boolean
}

export function updateSearchOption(searchOption: SearchOption): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {searchOptions, tabs, filterPids} = getState();

		dispatch(new Payloads.MiscUpdateSearchOption(searchOption));

		const mustFetchObjs = !isPidFreeTextSearch(tabs, filterPids);
		const mustFetchCounts = (searchOption.name === 'showDeprecated') && (searchOption.value !== searchOptions.showDeprecated);

		if (mustFetchObjs)
			dispatch(getFilteredDataObjects(mustFetchCounts));
		else if (mustFetchCounts)
			dispatch(getOriginsTable);
	};
}
