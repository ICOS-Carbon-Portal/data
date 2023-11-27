import React from 'react';
import {styles} from '../styles';
import { PreviewAvailability } from '../../models/Preview';


type Props = {
	clickAction(): void
	preview: PreviewAvailability
	style: React.CSSProperties
}

export default function PreviewIcon({ preview, style, clickAction}: Props){
	if (preview.previewType) {
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
					title={preview.previewAbsenceReason}
					className="fas fa-eye text-muted"
				/>
			</span>
		);
	}
}
