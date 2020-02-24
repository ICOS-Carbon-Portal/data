import {Sha256Str, UrlStr} from "../backend/declarations";
import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import {fetchJson} from "../backend";
import {failWithError, getKnownDataObjInfo} from "./common";
import {getLastSegmentInUrl} from "../utils";
import {MetaDataObject} from "../models/State";

export default function bootstrapMetadata(id?: UrlStr): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {metadata} = getState();

		if (id){
			if (metadata === undefined || id !== metadata.id) {

				fetchJson<MetaDataObject>(`${id}?format=json`).then(metadata => {
						const metadataWithId = {...metadata, ...{id}};
						dispatch(new Payloads.BootstrapRouteMetadata(metadataWithId));
					},
					failWithError(dispatch)
				);
			}
		} else {
			failWithError(dispatch)(new Error('Invalid state: Metadata id is missing'));
		}
	}
}

export function setMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(new Payloads.BackendObjectMetadataId(id));
		dispatch(getMetadataItem(id));
	};
}

function getMetadataItem(id: UrlStr): PortalThunkAction<void> {
	return (dispatch) => {
		fetchJson<MetaDataObject>(`${id}?format=json`).then(metadata => {
			const metadataWithId = {...metadata, ...{id}};
			dispatch(new Payloads.BackendObjectMetadata(metadataWithId));
		});
	};
}

export const updateFilteredDataObjects: PortalThunkAction<void> = (dispatch, getState) => {
	const {objectsTable, id} = getState();

	if (objectsTable.length === 0 && id !== undefined) {
		const hash: Sha256Str = getLastSegmentInUrl(id);

		dispatch(getKnownDataObjInfo([hash]));
		dispatch(setMetadataItem(id));
	}
};
