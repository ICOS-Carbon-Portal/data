import {Sha256Str, UrlStr} from "../backend/declarations";
import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import {getMetadata} from "../backend";
import {failWithError, getKnownDataObjInfo} from "./common";

export default function bootstrapMetadata(id?: UrlStr): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {metadata} = getState();

		if (id){
			if (metadata === undefined || id !== metadata.id) {

				getMetadata(id).then(metadata => {
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
		getMetadata(id).then(metadata => {
			const metadataWithId = {...metadata, ...{id}};
			dispatch(new Payloads.BackendObjectMetadata(metadataWithId));
		});
	};
}

export const updateFilteredDataObjects: PortalThunkAction<void> = (dispatch, getState) => {
	const {objectsTable, id} = getState();

	if (objectsTable.length === 0 && id !== undefined) {
		const hash: Sha256Str | undefined = id.split('/').pop();

		if (hash) {
			dispatch(getKnownDataObjInfo([hash]));
			dispatch(setMetadataItem(id));
		}
	}
};
