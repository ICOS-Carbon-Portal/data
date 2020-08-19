import React from 'react';
import {styles} from '../styles';
import { PreviewType } from '../../config';


type Props = {
	clickAction(): void,
	previewType: PreviewType | undefined,
	style: React.CSSProperties
}

export default function PreviewIcon({previewType, style, clickAction}: Props){

	return (
		<span style={style}>{previewType
			? <span
				style={styles.clickIcon as React.CSSProperties}
				title="Preview data"
				className="glyphicon glyphicon-eye-open"
				onClick={clickAction}
			/>
			: <span
				style={styles.disabledClickIcon as React.CSSProperties}
				title="No preview available for this data object"
				className="glyphicon glyphicon-eye-open text-muted"
			/>
		}</span>
	);
}
