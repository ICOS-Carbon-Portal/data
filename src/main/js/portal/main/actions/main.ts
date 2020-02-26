import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import stateUtils, {Profile, Route, WhoAmI} from "../models/State";
import {getProfile, getWhoIam, logOut} from "../backend";
import bootstrapMetadata from "./metadata";
import bootstrapPreview from "./preview";
import bootstrapCart from "./cart";
import bootstrapSearch from "./search";
import {failWithError, fetchCart, getBackendTables, getFilters, loadFromError} from "./common";
import {Sha256Str} from "../backend/declarations";
import {UiInactivateAllHelp} from "../reducers/actionpayloads";


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

export function bootstrapRoute(user: WhoAmI, route: Route, previewPids?: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {id} = getState();

		switch (route) {
			case 'search':
				dispatch(new Payloads.MiscRestoreFilters());
				dispatch(bootstrapSearch(true));
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
