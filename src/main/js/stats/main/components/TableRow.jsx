import React from 'react';
import config from '../../../common/main/config';

export const getRowSwitch = (dobj, onFileNameClick) => {
	if (dobj.x && dobj.y) {
		return RowPreviewTS;

	} else if (dobj.val && dobj.count) {
		return RowValCount;

	} else if (dobj.variables) {
		return RowPreviewNetCDF;

	} else if (dobj.mapView && dobj.y1 && dobj.y2) {
		return RowPreviewMapGraph;

	} else if (dobj.objId && dobj.fileName && dobj.count) {
		return RowDownloads;

	} else if (dobj.hashId && dobj.fileName && dobj.count && onFileNameClick) {
		return RowDownloadsWithLinks;

	} else {
		return null;
	}
};

const RowValCount = ({ dobj }) => {
	return (
		<tr>
			<td>{dobj.val}</td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const RowDownloads = ({ dobj }) => {
	const fileName = dobj.fileName || <i>Data object does no longer exist</i>;

	return (
		<tr>
			<td>{fileName}</td>
			<td><LandingPageLink hashId={dobj.objId} /></td>
			<td>{dobj.count}</td>
		</tr>
	)
};

const RowDownloadsWithLinks = ({ dobj, onFileNameClick }) => {
	const fileName = dobj.fileName || <i>Data object does no longer exist</i>;

	return (
		<tr>
			<td>
				<a style={{ cursor: 'pointer' }} onClick={() => onFileNameClick(dobj.hashId)} title="Show stats only for this data object">{fileName}</a>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	)
};

const RowPreviewTS = ({ dobj }) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Variables on X:</u> {dobj.x}</div>
					<div><u>Variables on Y:</u> {dobj.y}</div>
				</details>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const RowPreviewNetCDF = ({ dobj }) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Variables:</u> {dobj.variables}</div>
				</details>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const RowPreviewMapGraph = ({ dobj }) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Shown in map:</u> {dobj.mapView}</div>
					<div><u>Shown in graph (Y1):</u> {dobj.y1}</div>
					<div><u>Shown in graph (Y2):</u> {dobj.y2}</div>
				</details>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const LandingPageLink = ({ hashId }) => {
	return <a href={`${config.cpmetaObjectUri}${hashId}`} target="_blank">{hashId.slice(0, 24)}</a>
};
