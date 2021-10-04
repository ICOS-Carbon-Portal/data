import React, { CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';
import config from "../../config";
import CartItem from '../../models/CartItem';
import { Value } from '../../models/SpecTable';


export type CheckedObject = {
	dataset: Value | undefined
	dobj: UrlStr
	spec: UrlStr
	nextVersion?: string
}

type PreviewTypes = ("TIMESERIES" | "NETCDF" | "MAPGRAPH" | undefined)[]

interface Props {
	datasets: Value[]
	previewTypes: PreviewTypes
	checkedObjects: (CartItem | CheckedObject)[]
	style: CSSProperties
	clickAction: (objInfo: string[]) => void
	isL3Previewable?: boolean[]
}

const PreviewBtn: React.FunctionComponent<Props> = ({ datasets, previewTypes, isL3Previewable = [false], checkedObjects, style, clickAction }) => {
	const handlePreviewClick = () => {
		if (clickAction)
			clickAction(checkedObjects.flatMap(co => co.dobj));
	};

	const [enabled, title] = isPreviewEnabled(datasets, previewTypes, isL3Previewable);
	const className = "btn btn-outline-secondary " + (enabled ? "" : "disabled");
	const btnStyle: CSSProperties = title.length ? { pointerEvents: 'auto' } : {};

	return (
		<div style={style}>
			<button id="preview-button" onClick={handlePreviewClick} className={className} title={title} style={btnStyle} disabled={!enabled}>
				Preview
			</button>
		</div>
	);
}

const isPreviewEnabled = (datasets: Value[], previewTypes: PreviewTypes, isL3Previewable: boolean[]): [boolean, string] => {
	if (!datasets.length || !previewTypes.length)
		return [false, ""];

	if (previewTypes.length !== datasets.length)
		throw new Error("Unexpected error in PreviewBtn:isPreviewEnabled");

	if (previewTypes.includes(undefined))
		return [false, "You have selected a data object that cannot be previewed"];

	if (!datasets.every(dataset => dataset === datasets[0]))
		return [false, "Multiple previews are only available for data of same type"];

	if (previewTypes.length > 1 && previewTypes.every(type => type === config.NETCDF))
		return [false, "You can only preview one NetCDF at a time"];

	if (previewTypes.length > 1 && previewTypes.every(type => type === config.MAPGRAPH))
		return [false, "You can only preview one shipping line at a time"];
	
	if (previewTypes.length === 1 && previewTypes[0] === config.NETCDF && !isL3Previewable[0])
		return [false, "This NetCDF cannot be previewed"];

	return [true, ""];
};

export default PreviewBtn;
