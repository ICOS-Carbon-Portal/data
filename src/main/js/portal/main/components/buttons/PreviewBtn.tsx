import React, { CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';
import config, {PreviewType} from "../../config";
import CartItem from '../../models/CartItem';
import { Value } from '../../models/SpecTable';
import PreviewLookup from '../../models/PreviewLookup';
import { batchPreviewAvailability } from '../../models/Preview';


export type CheckedObject = {
	dataset: Value | undefined
	dobj: UrlStr
	spec: UrlStr
	nextVersion?: string
	submTime: Date
}

interface Props {
	checkedObjects: (CartItem | CheckedObject)[]
	previewLookup: PreviewLookup | undefined
	style: CSSProperties
	clickAction: (objInfo: string[]) => void
}

const PreviewBtn: React.FunctionComponent<Props> = ({ previewLookup, checkedObjects, style, clickAction }) => {
	const handlePreviewClick = () => {
		if (clickAction)
			clickAction(checkedObjects.flatMap(co => co.dobj));
	};

	const preview = batchPreviewAvailability(previewLookup, checkedObjects)
	const disabled = preview.previewType === null
	const className = "btn btn-outline-secondary " + (disabled ? "disabled" : "")
	const title = disabled ? preview.previewAbsenceReason : ""
	const btnStyle: CSSProperties = disabled ? { pointerEvents: 'auto' } : {}

	return (
		<div style={style}>
			<button id="preview-button" onClick={handlePreviewClick} className={className} title={title} style={btnStyle} disabled={disabled}>
				Preview
			</button>
		</div>
	);
}

export default PreviewBtn;
