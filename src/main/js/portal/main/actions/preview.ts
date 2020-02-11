import {PortalThunkAction} from "../store";
import {WhoAmI} from "../models/State";
import {fetchKnownDataObjects, getExtendedDataObjInfo, getTsSettings, saveTsSetting} from "../backend";
import * as Payloads from "../reducers/actionpayloads";
import {Sha256Str} from "../backend/declarations";
import {failWithError} from "./common";
import {getUrlsFromPids} from "../utils";


export default function bootstrapPreview(user: WhoAmI, pids: Sha256Str[]): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {tsSettings} = getState();

		const promises = Promise.all([
			fetchKnownDataObjects(pids),
			getExtendedDataObjInfo(getUrlsFromPids(pids))
		]);

		promises.then(([knownDataObjInfos, extendedDataObjInfo]) => {
				dispatch(new Payloads.BootstrapRoutePreview(pids, knownDataObjInfos.rows, extendedDataObjInfo));
			},
			failWithError(dispatch));

		if (Object.keys(tsSettings).length === 0){
			dispatch(getTsPreviewSettings(user));
		}
	}
}

function getTsPreviewSettings(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch) => {
		getTsSettings(user.email).then(tsSettings => {
			dispatch(new Payloads.BackendTsSettings(tsSettings));
		})
	};
}

export function storeTsPreviewSetting(spec: string, type: string, val: string): PortalThunkAction<void>{
	return (dispatch, getState) => {
		const user = getState().user;

		saveTsSetting(user.email, spec, type, val).then(tsSettings => {
			dispatch(new Payloads.BackendTsSettings(tsSettings));
		});
	};
}
