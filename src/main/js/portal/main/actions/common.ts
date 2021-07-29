import stateUtils, {
	ObjectsTable,
	Profile,
	Route,
	State,
	StateSerialized,
	WhoAmI
} from "../models/State";
import {PortalDispatch, PortalThunkAction} from "../store";
import {
	fetchBoostrapData,
	fetchKnownDataObjects,
	getCart,
	getError,
	fetchJson,
	saveCart,
	fetchStationPositions
} from "../backend";
import Cart, {restoreCarts} from "../models/Cart";
import * as Payloads from "../reducers/actionpayloads";
import config from "../config";
import {Sha256Str, UrlStr} from "../backend/declarations";
import {DeprecatedFilterRequest, FilterRequest, PidFilterRequest, TemporalFilterRequest} from "../models/FilterRequest";
import {isPidFreeTextSearch} from "../reducers/utils";
import {saveToRestheart} from "../../../common/main/backend";
import CartItem from "../models/CartItem";
import {bootstrapRoute, init, loadApp} from "./main";
import { StationPositions4326Lookup } from "../reducers/actionpayloads";
import { DataObject } from "../../../common/main/metacore";

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

export const getFilters = (state: State) => {
	const {tabs, filterTemporal, filterPids, searchOptions} = state;
	let filters: FilterRequest[] = [];

	if (isPidFreeTextSearch(tabs, filterPids)) {
		filters.push({category: 'deprecated', allow: true} as DeprecatedFilterRequest);
		filters.push({category: 'pids', pids: filterPids} as PidFilterRequest);
	} else {
		filters.push({category: 'deprecated', allow: searchOptions.showDeprecated} as DeprecatedFilterRequest);

		if (filterTemporal.hasFilter) {
			filters = filters.concat(filterTemporal.filters as TemporalFilterRequest[]);
		}
	}

	return filters;
};

export function getBackendTables(filters: FilterRequest[]): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return fetchBoostrapData(filters).then(allTables => {
				dispatch(getStationPositions());
				dispatch(new Payloads.BootstrapInfo(allTables));
			},
			failWithError(dispatch)
		);
	};
}

function getStationPositions(): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return fetchStationPositions().then(stationPos4326Lookup => {
			dispatch(new StationPositions4326Lookup(stationPos4326Lookup.rows))
		},
			failWithError(dispatch)
		);
	};
}

export function fetchCart(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch) => {
		getCart(user.email).then(({cartInSessionStorage, cartInRestheart}) => {

				cartInRestheart.then(restheartCart => {
					const cart = restoreCarts(cartInSessionStorage, restheartCart);
					dispatch(updateCart(user.email, cart));
				});
			}
		);
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

			return new CartItem(objInfo, previewType);
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
			dispatch(addStateMisingInHistory);
		} else {
			dispatch(init);
		}
	};
}

const addStateMisingInHistory: PortalThunkAction<void> = (dispatch, getState) => {
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
				const cart = restoreCarts({cart: stateJSON.cart}, {cart: new Cart()});
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
