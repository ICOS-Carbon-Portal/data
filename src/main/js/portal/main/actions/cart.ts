import {type PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import {type UrlStr} from "../backend/declarations";
import Cart from "../models/Cart";
import {
	fetchKnownDataObjects, fetchLabelLookup, getExtendedDataObjInfo, getIsBatchDownloadOk, getWhoIam
} from "../backend";
import {saveToRestheart} from "../../../common/main/backend";
import {type WhoAmI} from "../models/State";
import {getLastSegmentInUrl} from "../utils";
import {
	failWithError, fetchCart, getBackendTables, updateCart
} from "./common";


export default function bootstrapCart(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const cartHandler = getState().cart.isInitialized
			? Promise.resolve()
			: dispatch(fetchCart(user));

		cartHandler.then(_ => {
			const state = getState();

			const specTableHandler = (state.specTable.isInitialized || state.cart.items.length === 0)
				? Promise.resolve()
				: dispatch(getBackendTables([]));

			const labelLookupPromise = Object.keys(state.labelLookup).length > 0
				? Promise.resolve(undefined)
				: fetchLabelLookup();

			const pids = state.cart.items.map(ci => ci.dobj);

			Promise.all([
				fetchKnownDataObjects(pids.map(id => getLastSegmentInUrl(id))),
				getExtendedDataObjInfo(pids),
				labelLookupPromise,
				specTableHandler // To wait for spec info initialization
			]).catch(failWithError(dispatch)).then(([knownDataObjInfos, extendedDataObjInfo, labelLookup]) => {
				dispatch(new Payloads.BootstrapRouteCart(extendedDataObjInfo, knownDataObjInfos.rows, labelLookup));
			});
		});
	};
}

export function setCartName(newName: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();

		dispatch(updateCart(state.user.email, state.cart.withName(newName)));
	};
}

function updatePriorCart(cart: Cart): PortalThunkAction<void> {
	return dispatch => {
		dispatch(new Payloads.BackendUpdatePriorCart(cart));
	};
}

export function logCartDownloadClick(fileName: string, pids: string[]) {
	saveToRestheart({
		cartDownloadClick: {
			fileName,
			pids
		}
	});
}

export const fetchIsBatchDownloadOk: PortalThunkAction<void> = dispatch => {
	Promise.all([getIsBatchDownloadOk(), getWhoIam()])
		.catch(failWithError(dispatch)).then(([isBatchDownloadOk, user]) =>
			dispatch(new Payloads.BackendBatchDownload(isBatchDownloadOk, user)));
};

export function updateCheckedObjectsInCart(checkedObjectInCart: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return dispatch => {
		dispatch(new Payloads.UiUpdateCheckedObjsInCart(checkedObjectInCart));
	};
}

export function emptyCart(filename: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		const priorCart = state.cart.name ? state.cart : state.cart.withName(filename);
		dispatch(updatePriorCart(priorCart));
		dispatch(updateCart(state.user.email, new Cart(undefined, [])));
	};
}

export function restorePriorCart(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		dispatch(updateCart(state.user.email, state.priorCart ?? state.cart));
	};
}
