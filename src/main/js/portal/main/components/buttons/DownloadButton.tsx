import React, { Component, CSSProperties } from 'react';
import { DataObject } from '../../models/State';

type Props = {
	style: CSSProperties
	checkedObjects: string[]
	checkedObjectsInfo: DataObject[]
	enabled: boolean
}

export default class DownloadButton extends Component<Props> {
	constructor(props: Props) {
		super(props);
	}

	render() {
		const { style, enabled, checkedObjects, checkedObjectsInfo } = this.props;
		const link = enabled ? getDownloadLink(checkedObjects, checkedObjectsInfo) : undefined;
		const btnType = !enabled ? 'btn-outline-secondary' : 'btn-warning';
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
}

const getFilename = (checkedObjectsInfo: DataObject[]): string => {
	const filename: string[] = [];
	const postfix = "downloaded_data";
	const separator = "_";

	const today = new Date();
	const [year, month, day, hour, minute] = [
		today.getFullYear(),
		(today.getMonth()+1).toString().padStart(2,"0"),
		today.getDate().toString().padStart(2,"0"),
		today.getHours(),
		today.getMinutes()
	];

	filename.push(`${year}-${month}-${day}_${hour}${minute}`);

	if (checkedObjectsInfo.length === 0) return filename[0] + separator + postfix;

	const stationIds = new Set(checkedObjectsInfo.map((obj) => obj.extendedDobjInfo?.stationId ?? undefined));
	if (stationIds.size === 1) {
		filename.push(checkedObjectsInfo[0].extendedDobjInfo?.stationId ?? "");
	}

	const specs = new Set(checkedObjectsInfo.map((obj) => obj.spec));
	if (specs.size === 1) {
		filename.push(checkedObjectsInfo[0].specLabel ?? checkedObjectsInfo[0].spec.split('/').pop() ?? "");
	}

	if (filename.length === 1) {
		filename.push(postfix);
	}
	console.log(filename.join(separator).replaceAll(/[^0-9a-zA-Z\-._]/g, separator));

	return filename.join(separator).replaceAll(/[^0-9a-zA-Z\-._]/g, separator);
};

const getDownloadLink = (checkedObjects: string[], checkedObjectsInfo: DataObject[]): string => {
	const dobjIds = checkedObjects.map(dobj => dobj.split('/').pop());

	const ids = encodeURIComponent(JSON.stringify(dobjIds));
	const fileName = encodeURIComponent(getFilename(checkedObjectsInfo));

	return `/objects?ids=${ids}&fileName=${fileName}`;
};