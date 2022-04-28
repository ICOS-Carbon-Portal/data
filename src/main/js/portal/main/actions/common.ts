import stateUtils, {
	ObjectsTable,
	Profile,
	Route,
	State,
	StateSerialized, StationPos4326Lookup,
	WhoAmI
} from "../models/State";
import {PortalDispatch, PortalThunkAction} from "../store";
import {
	fetchBoostrapData,
	fetchKnownDataObjects,
	getCart,
	getError,
	fetchJson,
	saveCart, fetchStationPositions
} from "../backend";
import Cart, { restoreCart } from "../models/Cart";
import * as Payloads from "../reducers/actionpayloads";
import config from "../config";
import {Sha256Str, UrlStr} from "../backend/declarations";
import {FilterRequest} from "../models/FilterRequest";
import {isPidFreeTextSearch} from "../reducers/utils";
import {saveToRestheart} from "../../../common/main/backend";
import CartItem from "../models/CartItem";
import {bootstrapRoute, init, loadApp, restoreSpatialFilterFromMapProps} from "./main";
import { DataObject } from "../../../common/main/metacore";
import {Filter, Value} from "../models/SpecTable";
import keywordsInfo from "../backend/keywordsInfo";
import {SPECCOL} from "../sparqlQueries";
import CompositeSpecTable, {ColNames} from "../models/CompositeSpecTable";
import {BackendUpdateSpatialFilter, StationPositions4326Lookup} from "../reducers/actionpayloads";

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

export function updateRoute(route: Route, previewPids?: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		// The actual route is registered in state in the bootstrap function for each route
		dispatch(bootstrapRoute(getState().user, route, previewPids));
	};
}

export function getFilters(state: State, forStatCountsQuery: boolean = false): FilterRequest[] {
	const {tabs, filterTemporal, filterPids, filterNumbers, filterKeywords, searchOptions, specTable, keywords} = state;
	let filters: FilterRequest[] = [];

	if (isPidFreeTextSearch(tabs, filterPids)){
		filters.push({category: 'deprecated', allow: true});
		filters.push({category: 'pids', pids: filterPids});
	} else {
		filters.push({category: 'deprecated', allow: searchOptions.showDeprecated});
		filters.push({category: 'pids', pids: null});

		if (filterTemporal.hasFilter){
			filters = filters.concat(filterTemporal.filters);
		}

		if (varNamesAreFiltered(specTable)){
			const titles = specTable.getColumnValuesFilter('varTitle')
			if(titles != null){
				filters.push({category:'variableNames', names: titles.filter(Value.isString)})
			}
		}

		if (filterKeywords.length > 0){
			const dobjKeywords = filterKeywords.filter(kw => keywords.dobjKeywords.includes(kw));
			const kwSpecs = keywordsInfo.lookupSpecs(keywords, filterKeywords);
			let specs = kwSpecs;

			if (!forStatCountsQuery){
				const specsFilt = specTable.basics.getDistinctColValues(SPECCOL);
				specs = (Filter.and([kwSpecs, specsFilt]) || []).filter(Value.isString);
			}

			filters.push({category: 'keywords', dobjKeywords, specs});
		}

		filters = filters.concat(filterNumbers.validFilters);
	}

	return filters;
}

export const varNameAffectingCategs: ReadonlyArray<ColNames> = ['variable', 'valType'];

export function varNamesAreFiltered(specTable: CompositeSpecTable): boolean{
	return varNameAffectingCategs.some(cat => specTable.getFilter(cat) !== null);
}

export function getStationPosWithSpatialFilter(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		if (getState().stationPos4326Lookup.length)
			return;

		fetchStationPositions().then(stationPos4326 => {
				const stationPos4326Lookup: StationPos4326Lookup[] = stationPos4326.rows;
				dispatch(new StationPositions4326Lookup(stationPos4326Lookup));

				const spatialStationsFilter = restoreSpatialFilterFromMapProps(getState().mapProps, stationPos4326Lookup);
				dispatch(new BackendUpdateSpatialFilter(spatialStationsFilter));
			},
			failWithError(dispatch)
		);
	};
}

export function getBackendTables(filters: FilterRequest[]): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return fetchBoostrapData(filters).then(allTables => {
				dispatch(new Payloads.BootstrapInfo(allTables));
			},
			failWithError(dispatch)
		);
	};
}

// export function fetchSavedSearches(user: WhoAmI): PortalThunkAction<void> {
// 	return (dispatch) => {
// 		return getSavedSearches(user.email).then(restheartCart => {
// 			const savedSearches = restoreSavedSearches(restheartSavedSearthes);

// 			return dispatch(updateSavedSearches(user.email, savedSearches));
// 		})
// 	}
// }


export function fetchCart(user: WhoAmI): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return getCart(user.email).then(restheartCart => {
			const cart = restoreCart(restheartCart);

			return dispatch(updateCart(user.email, cart));
		});
	};
}

function updateCart(email: string | null, cart: Cart): PortalThunkAction<Promise<any>> {
	return dispatch => saveCart(email, cart).then(() =>
		dispatch(new Payloads.BackendUpdateCart(cart))
	);
}

export function removeFromCart(ids: UrlStr[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		const cart = state.cart.removeItems(ids);

		dispatch(updateCart(state.user.email, cart));
	};
}

export function getKnownDataObjInfo(dobjs: string[], cb?: Function): PortalThunkAction<void> {
	return (dispatch) => {
		fetchKnownDataObjects(dobjs).then(result => {
				dispatch(new Payloads.BackendObjectsFetched(result.rows, true));

				if (cb) dispatch(cb);
			},
			failWithError(dispatch)
		);
	};
}

export function setPreviewUrl(url: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.SetPreviewUrl(url));
	};
}

export function addToCart(ids: UrlStr[]): PortalThunkAction<void> {
	return (dispatch, getState) => {

		const {previewLookup, objectsTable, user, cart} = getState();

		const newItems = ids.filter(id => !cart.hasItem(id)).map(id => {
			const objInfo: ObjectsTable | undefined = objectsTable.find(o => o.dobj === id);

			if (objInfo === undefined)
				throw new Error(`Could not find objTable with id=${id} in ${objectsTable}`);

			const previewType = previewLookup?.forDataObjSpec(objInfo.spec)?.type

			return new CartItem(objInfo.dobj, objInfo, previewType);
		});

		if (newItems.length > 0) {
			dispatch(updateCart(user.email, cart.addItem(newItems)));
		}
	};
}

export function setMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.BackendObjectMetadataId(id));
		dispatch(fetchMetadataItem(id));
	};
}

function fetchMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		fetchJson<DataObject>(`${id}?format=json`).then(metadata => {
			const metadataWithId = { ...metadata, id };
			dispatch(new Payloads.BackendObjectMetadata(metadataWithId));
		});
	};
}

export function restoreFromHistory(historyState: StateSerialized): PortalThunkAction<void> {
	return (dispatch) => {
		const ts = historyState.ts ?? Date.now();

		if (Date.now() - ts < config.historyStateMaxAge) {
			dispatch(new Payloads.MiscRestoreFromHistory(historyState));
			dispatch(addStateMissingInHistory);
		} else {
			dispatch(init);
		}
	};
}

const addStateMissingInHistory: PortalThunkAction<void> = (dispatch, getState) => {
	const {route, metadata, id} = getState();

	if (route === 'metadata' && metadata && id !== undefined && metadata.id !== id)
		dispatch(setMetadataItem(id));
};

export function loadFromError(user: WhoAmI, errorId: string): PortalThunkAction<void> {
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
				const cart = restoreCart({cart: stateJSON.cart});
				const state: StateSerialized = Object.assign({},
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
