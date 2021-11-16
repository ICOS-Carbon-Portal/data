import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import stateUtils, {MapProps, Profile, Route, StationPos4326Lookup, WhoAmI} from "../models/State";
import {fetchStationPositions, getProfile, getWhoIam, logOut} from "../backend";
import bootstrapMetadata from "./metadata";
import bootstrapPreview from "./preview";
import bootstrapCart from "./cart";
import {getOriginsThenDobjList} from "./search";
import {failWithError, fetchCart, getBackendTables, getFilters, loadFromError} from "./common";
import {Sha256Str} from "../backend/declarations";
import {BackendUpdateSpatialFilter, StationPositions4326Lookup, UiInactivateAllHelp} from "../reducers/actionpayloads";
import {Coordinate} from "ol/coordinate";
import {EpsgCode, getProjection, getTransformPointFn} from "../models/ol/projections";
import {Filter} from "../models/SpecTable";
import {isPointInRectangle} from "../models/ol/utils";
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
		// Load state from hash
		dispatch(new Payloads.MiscInit());
		dispatch(getStationPosWithSpatialFilter());

		// Load specTable, labelLookup, paging and lookup to state
		const filters = getFilters(getState());
		dispatch(getBackendTables(filters)).then(_ => {
			// Then bootstrap current route
			const {route, preview} = getState();

			dispatch(bootstrapRoute(user, route, preview.pids));
		});

		type LoggedIn = {_id: string, profile: Profile | {}};

		getProfile(user.email).then((resp: {} | LoggedIn) => {
			const profile = (resp as LoggedIn).profile || {};

			dispatch(new Payloads.BackendUserInfo(user, profile));
		});

		dispatch(fetchCart(user));
	};
}

function getStationPosWithSpatialFilter(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		fetchStationPositions().then(stationPos4326 => {
				const stationPos4326Lookup: StationPos4326Lookup[] = stationPos4326.rows;
				dispatch(new StationPositions4326Lookup(stationPos4326Lookup));

				if (getState().tabs.resultTab === 2) {
					// resultTab === 2 is map view
					const spatialStationsFilter = restoreSpatialFilterFromMapProps(getState().mapProps, stationPos4326Lookup);
					dispatch(new BackendUpdateSpatialFilter(spatialStationsFilter));
				}
			},
			failWithError(dispatch)
		);
	};
}

export function restoreSpatialFilterFromMapProps(mapProps: MapProps, stationPos4326LookupList: StationPos4326Lookup[]): Filter{
	if (mapProps.rects === undefined || mapProps.rects.length === 0)
		return null;

	const coords = mapProps.rects.map(drawRectBoxToCoords);
	const destEpsgCode = `EPSG:${mapProps.srid}` as EpsgCode;
	// Register selected projection is case it's a projection not available by default in Proj4
	getProjection(`EPSG:${mapProps.srid}` as EpsgCode);
	const pointTransformer = getTransformPointFn("EPSG:4326", destEpsgCode);

	return stationPos4326LookupList
		.filter(stationPos4326Lookup => {
			const pos: Coordinate = pointTransformer(stationPos4326Lookup.lon, stationPos4326Lookup.lat);
			return isPointInRectangle(coords, pos);
		})
		.map(stationPos4326Lookup => stationPos4326Lookup.station);
}

export function bootstrapRoute(user: WhoAmI, route: Route, previewPids?: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {id} = getState();

		switch (route) {
			case 'search':
				dispatch(new Payloads.MiscRestoreFilters());
				dispatch(getOriginsThenDobjList);
				dispatch(new UiInactivateAllHelp());
				break;

			case 'preview':
				if (previewPids === undefined || previewPids.length === 0){
					failWithError(dispatch)(new Error('Preview cannot be initialized'));
					break;
				}
				dispatch(bootstrapPreview(user, previewPids as unknown as Sha256Str[]));
				break;

			case 'cart':
				dispatch(bootstrapCart());
				break;

			case 'metadata':
				dispatch(bootstrapMetadata(id));
				break;

			default:
				failWithError(dispatch)(new Error(`Argument for route '${route}' is not managed`));
		}
	};
}
