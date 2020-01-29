import config from "../config";
import {PortalDispatch, PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import stateUtils, {ObjectsTable, Profile, Route, State, StateSerialized, WhoAmI} from "../models/State";
import {saveToRestheart} from "../../../common/main/backend";
import {fetchBoostrapData, fetchKnownDataObjects, getCart, getError, getExtendedDataObjInfo, getMetadata, getProfile,
	getWhoIam, logOut, saveCart} from "../backend";
import Cart, {restoreCarts} from "../models/Cart";
import {DeprecatedFilterRequest, FilterRequest, PidFilterRequest, TemporalFilterRequest} from "../models/FilterRequest";
import {isPidFreeTextSearch} from "../reducers/utils";
import bootstrapMetadata from "./metadata";
import bootstrapPreview from "./preview";
import {UrlStr} from "../backend/declarations";
import bootstrapCart from "./cart";
import bootstrapSearch from "./search";
import CartItem from "../models/CartItem";
import {getNewTimeseriesUrl, getRouteFromLocationHash} from "../utils";


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
		// Load state from hash
		dispatch(new Payloads.MiscInit());

		// Load specTable, labelLookup, paging and lookup to state
		const filters = getFilters(getState());
		dispatch(getBackendTables(filters)).then(_ => {
			// Then bootstrap current route
			dispatch(bootstrapRoute(user));
		});

		type LoggedIn = {_id: string, profile: Profile | {}};

		getProfile(user.email).then((resp: {} | LoggedIn) => {
			const profile = (resp as LoggedIn).profile || {};

			dispatch(new Payloads.BackendUserInfo(user, profile));
		});

		dispatch(fetchCart(user));
	};
}

function bootstrapRoute(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {route, id} = getState();

		switch (route) {
			case config.DEFAULT_ROUTE:
			case config.ROUTE_SEARCH:
				dispatch(new Payloads.MiscRestoreFilters());
				dispatch(bootstrapSearch(true));
				break;

			case config.ROUTE_PREVIEW:
				dispatch(bootstrapPreview(user));
				break;

			case config.ROUTE_CART:
				dispatch(bootstrapCart());
				break;

			case config.ROUTE_METADATA:
				dispatch(bootstrapMetadata(id));
				break;

			default:
				failWithError(dispatch)(new Error(`Argument for route '${route}' is not managed`));
		}
	};
}

export function updateRoute(route?: Route): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const newRoute: Route = route || getRouteFromLocationHash() || config.ROUTE_SEARCH;

		dispatch(new Payloads.UiUpdateRoute(newRoute));
		dispatch(bootstrapRoute(getState().user));
	};
}

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

function getBackendTables(filters: FilterRequest[]): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return fetchBoostrapData(filters).then(allTables => {
				dispatch(new Payloads.BackendTables(allTables));
			},
			failWithError(dispatch)
		);
	};
}

export function fetchCart(user: WhoAmI): PortalThunkAction<void>  {
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

export function fetchExtendedDataObjInfo(dobjs: UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		getExtendedDataObjInfo(dobjs).then(extendedDobjInfo => {
				dispatch(new Payloads.BackendExtendedDataObjInfo(extendedDobjInfo));
			},
			failWithError(dispatch)
		);
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

export function switchToPreview(url: UrlStr | UrlStr[], newRoute: Route): PortalThunkAction<void> {
	return dispatch => {
		if (Array.isArray(url)){
			dispatch(setPreviewUrls(url));
		} else {
			dispatch(setPreviewUrl(url));
		}

		dispatch(updateRoute(newRoute));
	};
}

export function setPreviewUrl(url: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.SetPreviewItem(url));
	};
}

function setPreviewUrls(urls: UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.SetPreviewUrls(urls));
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

export function setMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.BackendObjectMetadataId(id));
		dispatch(fetchMetadataItem(id));
	};
}

function fetchMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		getMetadata(id).then(metadata => {
			const metadataWithId = Object.assign({}, metadata, {id});
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

	if (route === config.ROUTE_METADATA && metadata && id !== undefined && metadata.id !== id)
		dispatch(setMetadataItem(id));
};

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
