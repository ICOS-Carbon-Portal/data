import React, { CSSProperties, useMemo } from 'react';

type Props = {
	style: CSSProperties
	filename: string
	readyObjectIds: string[]
	enabled: boolean
	onSubmitHandler?: () => void
}

export default function DownloadButton(props: Props) {
	const { style, filename, enabled, readyObjectIds, onSubmitHandler } = props;

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

	return (
		<form action="/objects" method="post" onSubmit={onSubmitHandler} target="_blank">
			<input type="hidden" name="fileName" value={encodeURIComponent(filename)} />
			<input type="hidden" name="ids" value={JSON.stringify(dobjIds)} />

			<button className={className} style={btnStyle}>
				<span className="fas fa-download" style={{marginRight:9}} />Download
			</button>
		</form>
	);

}
