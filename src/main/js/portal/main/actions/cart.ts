import {PortalThunkAction} from "../store";
import CartItem from "../models/CartItem";
import * as Payloads from "../reducers/actionpayloads";
import {UrlStr} from "../backend/declarations";
import Cart from "../models/Cart";
import {getExtendedDataObjInfo, getIsBatchDownloadOk, getWhoIam, saveCart} from "../backend";
import {failWithError, fetchCart, getBackendTables} from "./common";
import {saveToRestheart} from "../../../common/main/backend";
import {WhoAmI} from "../models/State";


export default function bootstrapCart(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const cartHandler = getState().cart.isInitialized
			? Promise.resolve()
			: dispatch(fetchCart(user));

		cartHandler.then(_ => {
			const {cart} = getState();
			const cartItems: CartItem[] = cart.items;

			if (cartItems.length === 0) {
				dispatch(new Payloads.BootstrapRouteCart([], []));
				return;
			}

			const specTableHandler = getState().specTable.isInitialized
				? Promise.resolve()
				: dispatch(getBackendTables([]));

			specTableHandler.then(_ => {
				const rowsAsObjectsTable = cartItems.map(ci => ci.item);
				const dobjs: UrlStr[] = rowsAsObjectsTable.map(r => r.dobj);
				console.log({cart, cartItems, rowsAsObjectsTable, dobjs});
				getExtendedDataObjInfo(dobjs).then(extendedDobjInfo => {
						dispatch(new Payloads.BootstrapRouteCart(extendedDobjInfo, rowsAsObjectsTable));
					},
					failWithError(dispatch)
				);
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

function updateCart(email: string | null, cart: Cart): PortalThunkAction<Promise<any>> {
	return dispatch => saveCart(email, cart).then(() =>
		dispatch(new Payloads.BackendUpdateCart(cart))
	);
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
