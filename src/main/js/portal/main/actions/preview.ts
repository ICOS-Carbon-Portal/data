import {PortalThunkAction} from "../store";
import {WhoAmI} from "../models/State";
import {getTsSettings, saveTsSetting} from "../backend";
import * as Payloads from "../reducers/actionpayloads";
import config from "../config";
import {UrlStr} from "../backend/declarations";
import {failWithError, fetchExtendedDataObjInfo, getKnownDataObjInfo} from "./common";


export default function bootstrapPreview(user: WhoAmI): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {preview, tsSettings} = getState();

		if (preview.hasPids){
			if (!preview.hasAllItems) {
				dispatch(getKnownDataObjInfo(preview.pids, restorePreview));

				const ids: UrlStr[] = preview.pids.map((id: string) => config.previewIdPrefix[config.envri] + id);
				dispatch(fetchExtendedDataObjInfo(ids));
			}

		} else {
			failWithError(dispatch)(new Error('Invalid state: Preview is missing pids'));
		}

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

const restorePreview: PortalThunkAction<void> = (dispatch) => {
	dispatch(new Payloads.RestorePreview());
};
