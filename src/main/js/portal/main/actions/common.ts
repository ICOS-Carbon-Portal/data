import stateUtils, {
	MapProps,
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
	saveCart
} from "../backend";
import Cart, { restoreCart } from "../models/Cart";
import * as Payloads from "../reducers/actionpayloads";
import config from "../config";
import {Sha256Str, UrlStr} from "../backend/declarations";
import {FilterRequest, GeoFilterRequest} from "../models/FilterRequest";
import {isInPidFilteringMode} from "../reducers/utils";
import {saveToRestheart} from "../../../common/main/backend";
import CartItem from "../models/CartItem";
import {bootstrapRoute, init, loadApp} from "./main";
import { DataObject } from "../../../common/main/metacore";
import {Filter, Value} from "../models/SpecTable";
import keywordsInfo from "../backend/keywordsInfo";
import {SPECCOL} from "../sparqlQueries";
import CompositeSpecTable, {ColNames} from "../models/CompositeSpecTable";
import commonConfig from '../../../common/main/config';
import { drawRectBoxToCoords, getLastSegmentsInUrls } from "../utils";
import { EpsgCode, getProjection, getTransformPointFn } from "icos-cp-ol";
import { Coordinate } from "ol/coordinate";
import {QueryParameters} from "./types";

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

export function getFilters(state: State): FilterRequest[] {
	const {tabs, filterTemporal, filterPids, filterNumbers, filterKeywords, searchOptions, specTable} = state;
	let filters: FilterRequest[] = [];

	filters.push({category: 'deprecated', allow: searchOptions.showDeprecated});

	if (isInPidFilteringMode(tabs, filterPids)){
		filters.push({category: 'pids', pids: filterPids});
	} else {
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
			filters.push({category: 'keywords', keywords: filterKeywords});
		}

		const geoFilter = getGeoFilter(state.mapProps)
		if(geoFilter) filters.push(geoFilter)

		filters = filters.concat(filterNumbers.validFilters);
	}

	return filters;
}

function getGeoFilter(mapProps: MapProps): GeoFilterRequest | null {
	const rects = mapProps.rects
	if (!rects || rects.length === 0) return null

	const srcEpsgCode = `EPSG:${mapProps.srid}` as EpsgCode
	// Register selected projection is case it's a projection not available by default in Proj4
	getProjection(srcEpsgCode)

	const pointTransformer = getTransformPointFn(srcEpsgCode, "EPSG:4326")
	const coordTransformer = (c: Coordinate) => pointTransformer(c[0], c[1]).join(' ')

	const wktPolygons: string[] = rects.map(bbox => {
		const coords = drawRectBoxToCoords(bbox).map(coordTransformer).join(', ')
		return '((' + coords + '))'
	});

	const wktGeo = wktPolygons.length === 1
		? 'POLYGON ' + wktPolygons[0]
		: 'MULTIPOLYGON (' + wktPolygons.join(', ') + ')'

	return {
		category: 'geo',
		wktGeo
	}
}

export const varNameAffectingCategs: ReadonlyArray<ColNames> = ['variable', 'valType'];

export function varNamesAreFiltered(specTable: CompositeSpecTable): boolean{
	return varNameAffectingCategs.some(cat => specTable.getFilter(cat) !== null);
}

export function getBackendTables(queryParams: QueryParameters): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return fetchBoostrapData(queryParams).then(allTables => {
				dispatch(new Payloads.BootstrapInfo(allTables));
			},
			failWithError(dispatch)
		);
	};
}

export function fetchCart(user: WhoAmI): PortalThunkAction<Promise<void>> {
	return (dispatch) => {
		return getCart(user.email).then(restheartCart => {
			const cart = restoreCart(restheartCart);

			return dispatch(updateCart(user.email, cart));
		});
	};
}

function updateCart(email: string | null, cart: Cart): PortalThunkAction<Promise<any>> {
	const cartLinks = document.querySelectorAll('.cart-link');
	cartLinks.forEach(link => {
		const num = link.querySelector('.items-number')
		if (num) {
			num.textContent = cart.count.toString();
		}
	});

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

		if (user.email) {
			const newItems = ids.filter(id => !cart.hasItem(id)).map(id => {
				const objInfo: ObjectsTable | undefined = objectsTable.find(o => o.dobj === id);

				if (objInfo === undefined)
					throw new Error(`Could not find objTable with id=${id} in ${objectsTable}`);

				const previewType = previewLookup?.forDataObjSpec(objInfo.spec)?.type

				return new CartItem(objInfo.dobj, objInfo, previewType);
			});

			dispatch(new Payloads.MiscUpdateAddToCart(undefined));

			if (newItems.length > 0) {
				dispatch(updateCart(user.email, cart.addItem(newItems)));
			}
		} else {
			dispatch(new Payloads.MiscUpdateAddToCart(getLastSegmentsInUrls(ids)));
			const url = window.location;
			url.hash = stateUtils.stateToHash(getState());
			dispatch(new Payloads.MiscUpdateAddToCart(undefined));
			window.location.href = `${commonConfig.authBaseUri}/login/?targetUrl=${encodeURIComponent(url.href)}`;
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
