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

	const licenceAcceptanceTime = localStorage.getItem("licenceAcceptanceTime");
	const bypassLicence = Boolean(licenceAcceptanceTime &&
		Date.now() - parseInt(licenceAcceptanceTime, 10) < 1000*60*60*24*30);

	const dobjIds = readyObjectIds.map(dobj => dobj.split('/').pop());

	const btnType = enabled ? 'btn-warning' : 'btn-outline-secondary';
	const className = `btn ${btnType}${enabled ? "" : " disabled"}`;
	const btnStyle: CSSProperties = enabled ? {...style} : {...style, pointerEvents: 'auto', cursor: 'not-allowed'};

	return (
		<form action="/objects" method="post" onSubmit={onSubmitHandler} target="_blank">
			<input type="hidden" name="fileName" value={encodeURIComponent(filename)} />
			<input type="hidden" name="ids" value={JSON.stringify(dobjIds)} />
			{ bypassLicence ? <input type="hidden" name="licenceOk" value="true" /> : <></>}

			<button className={className} style={btnStyle}>
				<span className="fas fa-download" style={{marginRight:9}} />Download
			</button>
		</form>
	);

}
