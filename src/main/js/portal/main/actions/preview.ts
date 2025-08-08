import {type PortalThunkAction} from "../store";
import {type WhoAmI} from "../models/State";
import {
	fetchKnownDataObjects, fetchLabelLookup, fetchSpecTableData, getExtendedDataObjInfo, getTsSettings, saveTsSetting
} from "../backend";
import * as Payloads from "../reducers/actionpayloads";
import {type Sha256Str} from "../backend/declarations";
import {getUrlsFromPids} from "../utils";
import {failWithError, fetchCart, addToCart} from "./common";


export default function bootstrapPreview(user: WhoAmI, pids: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {tsSettings, specTable, labelLookup, cart, itemsToAddToCart} = getState();

		// SpecTable and labelLookup must be fetched from backend if app begins with a preview route
		const specTablesPromise = specTable.isInitialized
			? Promise.resolve(undefined)
			: fetchSpecTableData([]);
		const labelLookupPromise = Object.keys(labelLookup).length > 0
			? Promise.resolve(undefined)
			: fetchLabelLookup();
		const cartPromise = cart.isInitialized
			? Promise.resolve()
			: dispatch(fetchCart(user));

		const promises = Promise.all([
			fetchKnownDataObjects(pids),
			getExtendedDataObjInfo(getUrlsFromPids(pids)),
			specTablesPromise,
			labelLookupPromise,
			cartPromise
		]);

		promises.catch(failWithError(dispatch)).then(([knownDataObjInfos, extendedDataObjInfo, specTables, labelLookup]) => {
			dispatch(new Payloads.BootstrapRoutePreview(pids, knownDataObjInfos.rows, extendedDataObjInfo, specTables, labelLookup));
			if (itemsToAddToCart) {
				dispatch(addToCart(getUrlsFromPids(itemsToAddToCart)));
			}
		});

		if (Object.keys(tsSettings).length === 0) {
			dispatch(getTsPreviewSettings(user));
		}
	};
}

function getTsPreviewSettings(user: WhoAmI): PortalThunkAction<void> {
	return dispatch => {
		getTsSettings(user.email).then(tsSettings => {
			dispatch(new Payloads.BackendTsSettings(tsSettings));
		});
	};
}

export function storeTsPreviewSetting(spec: string, type: string, val: string): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const user = getState().user;

		saveTsSetting(user.email, spec, type, val).then(tsSettings => {
			dispatch(new Payloads.BackendTsSettings(tsSettings));
		});
	};
}
