import React, { CSSProperties, useMemo, useState } from 'react';
import { DataObject, ExtendedDobjInfo, LabelLookup } from '../../models/State';

type Props = {
	style: CSSProperties
	checkedObjects: string[]
	enabled: boolean
	objectsTable: DataObject[]
	extendedDobjInfo: ExtendedDobjInfo[]
	labelLookup: LabelLookup
}

export default function DownloadButton(props: Props) {
	const { style, enabled, checkedObjects, objectsTable, extendedDobjInfo, labelLookup } = props;

	type CheckedInfo = {
		spec?: string
		stationId?: string
	};

	type CheckedInfoCache = Record<string, CheckedInfo>;

	const [checkedInfoCache, setCheckedInfoCache] = useState<CheckedInfoCache>({});

	const newCache: CheckedInfoCache = {};
	let shouldSetCache = false;
	for (const checkedObject of checkedObjects) {
		if (!checkedInfoCache[checkedObject]) {
			const spec = objectsTable.find(
				(dataObject) => dataObject.dobj === checkedObject
			)?.spec;
			const stationId = extendedDobjInfo.find(
				(edobj) => edobj.dobj === checkedObject
			)?.stationId;
			newCache[checkedObject] = {spec, stationId};
			shouldSetCache = true;
		}
	}

	if (shouldSetCache) {
		setCheckedInfoCache({ ...checkedInfoCache, ...newCache });
	}

	const checkedObjectsInfo: CheckedInfoCache = useMemo(() => {
		const checkedInfo: CheckedInfoCache = {};
		for (const checkedObject of checkedObjects) {
			checkedInfo[checkedObject] = checkedInfoCache[checkedObject];
		}
		return checkedInfo;
	}, [checkedInfoCache]);

	const filename: string = useMemo(() => {
		const separator = "_";
		const multiSeparatorRegExp = new RegExp(`[${separator}]+`, "g");
		const endSeparatorRegExp = new RegExp(`[${separator}]$`);

		const today = new Date();
		const [year, month, date, hour, minute] = [
			today.getFullYear(),
			(today.getMonth()+1).toString().padStart(2,"0"),
			today.getDate().toString().padStart(2,"0"),
			today.getHours(),
			today.getMinutes()
		];

		const timestamp = (`${year}-${month}-${date}_${hour}${minute}`);

		const stationIdsArr: string[] = Object.values(checkedObjectsInfo)
			.flatMap((info) => info.stationId ? [info.stationId] : []);
		const stationIdsSet = new Set(stationIdsArr);
		const stationId = stationIdsSet.size === 1 ? stationIdsArr[0] : "";
		
		const specsArr: string[] = Object.values(checkedObjectsInfo)
			.flatMap((info) => info.spec ? [info.spec] : []);
		const specsSet = new Set(specsArr);
		const spec = specsSet.size === 1 ? specsArr[0] : "";

		const specLabel = spec ? labelLookup[spec].label : "";
		const postfix = (specLabel || stationId) ? "" : "downloaded_data";
		const filenameArr = [timestamp, specLabel, stationId, postfix];
		const filename = filenameArr.join(separator)
			.replaceAll(/[^0-9a-zA-Z\-._]/g, separator)
			.replaceAll(multiSeparatorRegExp, separator)
			.replace(endSeparatorRegExp, "");

		return filename;
	}, [checkedObjectsInfo]);

	const downloadLink = useMemo(() => {
		const dobjIds = checkedObjects.map(dobj => dobj.split('/').pop());
		if (dobjIds.length == 1) {
			return `/objects/${dobjIds[0]}`;
		} else {
			const ids = encodeURIComponent(JSON.stringify(dobjIds));
			return `/objects?ids=${ids}&fileName=${encodeURIComponent(filename)}`;
		}
	}, [checkedObjects, filename]);

	const link = enabled ? downloadLink : undefined;
	const btnType = enabled ? 'btn-warning' : 'btn-outline-secondary';
	const className = `btn ${btnType} ${enabled ? "" : "disabled"}`;
	const btnStyle: CSSProperties = enabled ? {} : { pointerEvents: 'auto', cursor: 'not-allowed' };

	return (
		<div style={style}>
			<a href={link} id="download-button" className={className} style={btnStyle}>
				Download
			</a>
		</div>
	);
}
