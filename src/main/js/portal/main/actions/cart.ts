import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import {UrlStr} from "../backend/declarations";
import Cart from "../models/Cart";
import {fetchKnownDataObjects, fetchLabelLookup, getExtendedDataObjInfo, getIsBatchDownloadOk, getWhoIam, saveCart} from "../backend";
import {failWithError, fetchCart, getBackendTables} from "./common";
import {saveToRestheart} from "../../../common/main/backend";
import {WhoAmI} from "../models/State";
import { getLastSegmentInUrl } from "../utils";


export default function bootstrapCart(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const cartHandler = getState().cart.isInitialized
			? Promise.resolve()
			: dispatch(fetchCart(user))

		cartHandler.then(_ => {
			const state = getState()

			const specTableHandler = (state.specTable.isInitialized || state.cart.items.length === 0)
				? Promise.resolve()
				: dispatch(getBackendTables([]));

			const labelLookupPromise = Object.keys(state.labelLookup).length
				? Promise.resolve(undefined)
				: fetchLabelLookup();

			const pids = state.cart.items.map(ci => ci.dobj)

			Promise.all([
				fetchKnownDataObjects(pids.map(id => getLastSegmentInUrl(id))),
				getExtendedDataObjInfo(pids),
				labelLookupPromise,
				specTableHandler //to wait for spec info initialization
			]).then(
				([knownDataObjInfos, extendedDataObjInfo, labelLookup]) => {
					dispatch(new Payloads.BootstrapRouteCart(extendedDataObjInfo, knownDataObjInfos.rows, labelLookup));
				},
				failWithError(dispatch)
			)
		})
	}
}

export function setCartName(newName: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();

		dispatch(updateCart(state.user.email, state.cart.withName(newName)));
	};
}

function updateCart(email: string | null, cart: Cart): PortalThunkAction<Promise<any>> {
	return dispatch => saveCart(email, cart).then(() => {
		dispatch(new Payloads.BackendUpdateCart(cart))
});
}

function updateLastCart(cart: Cart): PortalThunkAction<void> {
	return dispatch => {
		dispatch(new Payloads.BackendUpdateLastCart(cart))
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
		.then(([isBatchDownloadOk, user]) =>
				dispatch(new Payloads.BackendBatchDownload(isBatchDownloadOk, user)),
			failWithError(dispatch)
		);
};

export function updateCheckedObjectsInCart(checkedObjectInCart: UrlStr | UrlStr[]): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.UiUpdateCheckedObjsInCart(checkedObjectInCart));
	};
}

export function emptyCart(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		dispatch(updateLastCart(state.cart));
		dispatch(updateCart(state.user.email, new Cart()));
	}
}

export function restoreLastCart(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		dispatch(updateCart(state.user.email, state.lastCart ?? state.cart));
	}
}