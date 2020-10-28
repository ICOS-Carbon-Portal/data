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
					style={styles.clickIcon as React.CSSProperties}
					title="Preview data"
					className="glyphicon glyphicon-eye-open"
					onClick={clickAction}
				/>
			</span>
		);
	} else {
		return (
			<span style={style}>
				<span
					style={styles.disabledClickIcon as React.CSSProperties}
					title="No preview available for this data object"
					className="glyphicon glyphicon-eye-open text-muted"
				/>
			</span>
		);
	}
}
