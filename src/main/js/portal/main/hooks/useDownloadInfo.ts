import { useMemo, useState, useEffect } from 'react';
import { KnownDataObject, ExtendedDobjInfo, LabelLookup } from '../models/State';


type ReadyInfo = {
	spec?: string;
	stationId?: string;
};

type InfoCache = Record<string, ReadyInfo>;

interface Props {
	readyObjectIds: string[];
	objectsTable: KnownDataObject[]
	extendedDobjInfo: ExtendedDobjInfo[]
	labelLookup: LabelLookup
}

export function useDownloadInfo(props: Props) {
    const { readyObjectIds, objectsTable, extendedDobjInfo, labelLookup } = props;
	const [infoCache, setInfoCache] = useState<InfoCache>({});

	useEffect(() => {
		const newCache: InfoCache = {};
		let updateCache = false;

		for (const readyObjectId of readyObjectIds) {
			if (!infoCache[readyObjectId]) {
				const spec = objectsTable.find(
					(dataObject) => dataObject.dobj === readyObjectId
				)?.spec;

				const stationId = extendedDobjInfo.find(
					(edobj) => edobj.dobj === readyObjectId
				)?.stationId;

				newCache[readyObjectId] = { spec, stationId };
				updateCache = true;
			}
		}

		if (updateCache) {
			setInfoCache((prev) => ({ ...prev, ...newCache }));
		}
	}, [readyObjectIds, objectsTable, extendedDobjInfo]);

	const readyObjectsInfo: InfoCache = useMemo(() => {
		const readyInfo: InfoCache = {};
		for (const readyObjectId of readyObjectIds) {
			if (infoCache[readyObjectId]) {
				readyInfo[readyObjectId] = infoCache[readyObjectId];
			}
		}
		return readyInfo;
	}, [infoCache, readyObjectIds]);

	const filename: string = useMemo(() => {
		const separator = "_";
		const multiSeparatorRegExp = new RegExp(`[${separator}]+`, "g");
		const endSeparatorRegExp = new RegExp(`[${separator}]$`);

		const today = new Date();
		const [year, month, date, hour, minute] = [
			today.getFullYear(),
			(today.getMonth() + 1).toString().padStart(2,"0"),
			today.getDate().toString().padStart(2,"0"),
			today.getHours().toString().padStart(2,"0"),
			today.getMinutes().toString().padStart(2,"0")
		];

		const timestamp = `${year}-${month}-${date}_${hour}${minute}`;

		const stationIdsArr: string[] = Object.values(readyObjectsInfo)
			.flatMap((info) => info.stationId ? [info.stationId] : [""]);
		const stationId = (new Set(stationIdsArr)).size === 1 ? stationIdsArr[0] : "";

		const specsArr: string[] = Object.values(readyObjectsInfo)
			.flatMap((info) => info.spec ? [info.spec] : [""]);
		const spec = (new Set(specsArr)).size === 1 ? specsArr[0] : "";

		const specLabel = spec ? labelLookup[spec].label : "";
		const postfix = (specLabel || stationId) ? "" : "downloaded_data";
		const filenameArr = [timestamp, specLabel, stationId, postfix];
		const filename = filenameArr.join(separator)
			.replaceAll(/[^0-9a-zA-Z\-._]/g, separator)
			.replaceAll(multiSeparatorRegExp, separator)
			.replace(endSeparatorRegExp, "");

		return filename;
	}, [readyObjectsInfo]);

	return { filename };
}
