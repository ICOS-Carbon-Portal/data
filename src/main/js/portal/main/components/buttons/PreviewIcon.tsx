import React from 'react';
import {styles} from '../styles';
import { PreviewType } from '../../config';


type Props = {
	clickAction(): void
	previewType: PreviewType | undefined
	isL3Previewable: boolean
	style: React.CSSProperties
}

export default function PreviewIcon({ previewType, isL3Previewable, style, clickAction}: Props){
	if ((previewType === "NETCDF" && isL3Previewable) || (previewType !== "NETCDF" && previewType)) {
		return (
			<span style={style}>
				<span
					style={styles.clickIcon}
					title="Preview data"
					className="fas fa-eye"
					onClick={clickAction}
				/>
			</span>
		);
	} else {
		return (
			<span style={style}>
				<span
					style={styles.disabledClickIcon}
					title="No preview available for this data object"
					className="fas fa-eye text-muted"
				/>
			</span>
		);
	}
}
