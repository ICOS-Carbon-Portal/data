import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import {UrlStr} from "../backend/declarations";
import Cart from "../models/Cart";
import {fetchKnownDataObjects, fetchLabelLookup, getExtendedDataObjInfo, getIsBatchDownloadOk, getWhoIam} from "../backend";
import {failWithError, fetchCart, getBackendTables, updateCart} from "./common";
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

export function emptyCart(filename: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		const priorCart = state.cart.name ? state.cart : state.cart.withName(filename);
		dispatch(updatePriorCart(priorCart));
		dispatch(updateCart(state.user.email, new Cart(undefined, [])));
	}
}

export function restorePriorCart(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const state = getState();
		dispatch(updateCart(state.user.email, state.priorCart ?? state.cart));
	}
}
