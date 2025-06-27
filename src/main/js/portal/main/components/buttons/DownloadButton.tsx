import React, { CSSProperties, useMemo } from 'react';

type Props = {
	style: CSSProperties
	filename: string
	readyObjectIds: string[]
	enabled: boolean
	onSubmitAsForm?: () => void
}

export default function DownloadButton(props: Props) {
	const { style, filename, enabled, readyObjectIds, onSubmitAsForm } = props;

	const dobjIds = readyObjectIds.map(dobj => dobj.split('/').pop());

	const downloadLink = useMemo(() => {
		if (dobjIds.length == 1) {
			return `/objects/${dobjIds[0]}`;
		} else {
			const ids = encodeURIComponent(JSON.stringify(dobjIds));
			return `/objects?ids=${ids}&fileName=${encodeURIComponent(filename)}`;
		}
	}, [dobjIds, filename]);

	const link = enabled ? downloadLink : undefined;
	const btnType = enabled ? 'btn-warning' : 'btn-outline-secondary';
	const className = `btn ${btnType} ${enabled ? "" : "disabled"}`;
	const btnStyle: CSSProperties = enabled ? {} : { pointerEvents: 'auto', cursor: 'not-allowed' };

	if (onSubmitAsForm) {
		return (
			<form action="/objects" method="post" onSubmit={onSubmitAsForm} target="_blank">
				<input type="hidden" name="fileName" value={encodeURIComponent(filename)} />
				<input type="hidden" name="ids" value={JSON.stringify(dobjIds)} />

				<button className={className} style={btnStyle}>
					<span className="fas fa-download" style={{marginRight:9}} />Download
				</button>
			</form>
		);
	} else {
		return (
			<div style={style}>
				<a href={link} id="download-button" className={className} style={btnStyle}>
					Download
				</a>
			</div>
		);
	}
}
