import {AsyncResult, Sha256Str, UrlStr} from "../backend/declarations";
import {PortalThunkAction} from "../store";
import * as Payloads from "../reducers/actionpayloads";
import {fetchJson, fetchKnownDataObjects} from "../backend";
import {setMetadataItem, updateRoute} from "../actions/common";
import {failWithError, getKnownDataObjInfo, } from "./common";
import {getLastSegmentInUrl} from "../utils";
import {MetaDataWStats} from "../models/State";
import {setKeywordFilter} from "../actions/search";
import config from "../../../common/main/config";
import { DataObject } from "../../../common/main/metacore";

type DownloadCount = [{ downloadCount: number }];
type PreviewCount = [{ count: number }?];
type DispatchMetaProps = [
	downloads: DownloadCount,
	previews: PreviewCount,
	metadataObj?: DataObject,
	knownDataObjInfos?: AsyncResult<typeof fetchKnownDataObjects>
];

export default function bootstrapMetadata(id?: UrlStr): PortalThunkAction<void> {
	return (dispatch, getState) => {
		const {metadata, objectsTable} = getState();

		if (id) {

			const pid = getLastSegmentInUrl(id);
			
			const downloadsPromise = fetchJson<DownloadCount>(`/stats/api/downloadCount?hashId=${pid}`);
			const previewsUrl = `${config.restheartDbUrl}portaluse/_aggrs/getPreviewCountForPid?avars=${encodeURIComponent(JSON.stringify({ pid }))}&np`;
			const previewsPromise = fetchJson<PreviewCount>(previewsUrl);

			
			const dispatchMeta = ([downloads, previews, metadataObj, knownDataObjInfos]: DispatchMetaProps) => {
				const downloadCount = downloads[0].downloadCount;
				const previewCount = previews.length ? previews[0]!.count : 0;
				const metaDataWStats: MetaDataWStats = metadataObj === undefined
					? { ...metadata!, id, downloadCount, previewCount }
					: { ...metadataObj, id, downloadCount, previewCount };
				const objectsTable = knownDataObjInfos === undefined
					? undefined
					: knownDataObjInfos.rows

				dispatch(new Payloads.BootstrapRouteMetadata(id, metaDataWStats, objectsTable));
			};

			if (metadata === undefined || id !== metadata.id) {
				if (objectsTable.length) {
					const promises = Promise.all([
						downloadsPromise,
						previewsPromise,
						fetchJson<DataObject>(`${id}?format=json`)
					]);

					promises.then(dispatchMeta, failWithError(dispatch));

				} else {
					const promises = Promise.all([
						downloadsPromise,
						previewsPromise,
						fetchJson<DataObject>(`${id}?format=json`),
						fetchKnownDataObjects([pid])
					]);

					promises.then(dispatchMeta, failWithError(dispatch));
				}
			} else {
				const promises = Promise.all([
					downloadsPromise,
					previewsPromise
				]);

				promises.then(dispatchMeta, failWithError(dispatch));
			}

		} else {
			failWithError(dispatch)(new Error('Invalid state: Metadata id is missing'));
		}
	}
}

export const updateFilteredDataObjects: PortalThunkAction<void> = (dispatch, getState) => {
	const {objectsTable, id} = getState();

	if (objectsTable.length === 0 && id !== undefined) {
		const hash: Sha256Str = getLastSegmentInUrl(id);

		dispatch(getKnownDataObjInfo([hash]));
		dispatch(setMetadataItem(id));
	}
};

export function searchKeyword(keyword: string): PortalThunkAction<void> {
	return (dispatch) => {
		dispatch(setKeywordFilter([keyword], true))
		dispatch(updateRoute('search'))
	}
}
