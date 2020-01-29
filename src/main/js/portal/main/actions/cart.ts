import {PortalThunkAction} from "../store";
import CartItem from "../models/CartItem";
import * as Payloads from "../reducers/actionpayloads";
import {failWithError, fetchExtendedDataObjInfo} from "./main";
import {UrlStr} from "../backend/declarations";
import Cart from "../models/Cart";
import {getIsBatchDownloadOk, getWhoIam, saveCart} from "../backend";


export default function bootstrapCart(): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {cart, objectsTable} = getState();

		const cartItems: CartItem[] = cart.items;
		const rowsAsObjectsTable = cartItems.map(ci => ci.item);
		const dobjs: UrlStr[] = rowsAsObjectsTable.map(r => r.dobj);

		if (objectsTable.length === 0) {
			dispatch(fetchExtendedDataObjInfo(dobjs));
			dispatch(new Payloads.BackendObjectsFetched(rowsAsObjectsTable, true));
		}
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
