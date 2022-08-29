import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import stateUtils, {MapProps, Profile, Route, StationPos4326Lookup, WhoAmI} from "../models/State";
import {getProfile, getWhoIam, logOut} from "../backend";
import bootstrapPreview from "./preview";
import bootstrapCart from "./cart";
import bootstrapSearch from "./search";
import {failWithError, loadFromError} from "./common";
import {Sha256Str} from "../backend/declarations";
import {Coordinate} from "ol/coordinate";
import {EpsgCode, getProjection, getTransformPointFn, isPointInRectangle} from "icos-cp-ol";
import {Filter, Value} from "../models/SpecTable";
import {drawRectBoxToCoords} from "../utils";


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

export function loadApp(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {

		const {route, preview} = getState();
		dispatch(bootstrapRoute(user, route ?? 'search', preview.pids));

		type LoggedIn = {_id: string, profile: Profile | {}};

		getProfile(user.email).then((resp: {} | LoggedIn) => {
			const profile = (resp as LoggedIn).profile || {};

			dispatch(new Payloads.BackendUserInfo(user, profile));
		});
	};
}

export function bootstrapRoute(user: WhoAmI, route: Route, previewPids?: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {id, tabs} = getState();

		switch (route) {
			case 'search':
				dispatch(bootstrapSearch(user, tabs));
				break;

			case 'preview':
				if (previewPids === undefined || previewPids.length === 0){
					failWithError(dispatch)(new Error('Preview cannot be initialized'));
					break;
				}
				dispatch(bootstrapPreview(user, previewPids));
				break;

			case 'cart':
				dispatch(bootstrapCart(user));
				break;

			case 'metadata':
				if (id)
					window.location.href = id;
				break;

			default:
				failWithError(dispatch)(new Error(`Argument for route '${route}' is not managed`));
		}
	};
}

export function restoreSpatialFilterFromMapProps(mapProps: MapProps, allStations: Value[], posLookup: StationPos4326Lookup): Filter{
	if (mapProps.rects === undefined || mapProps.rects.length === 0)
		return null;

	const coords = mapProps.rects.map(drawRectBoxToCoords);
	const destEpsgCode = `EPSG:${mapProps.srid}` as EpsgCode;
	// Register selected projection is case it's a projection not available by default in Proj4
	getProjection(`EPSG:${mapProps.srid}` as EpsgCode);
	const pointTransformer = getTransformPointFn("EPSG:4326", destEpsgCode);

	return allStations
		.filter(Value.isString)
		.filter(stationUri => {
			const latLon = posLookup[stationUri]
			if(!latLon) return false;
			const pos: Coordinate = pointTransformer(latLon.lon, latLon.lat);
			return isPointInRectangle(coords, pos);
		});
}
