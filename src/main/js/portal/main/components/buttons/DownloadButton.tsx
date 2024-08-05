import React, { Component, CSSProperties } from 'react';

type Props = {
	style: CSSProperties
	checkedObjects: string[]
	enabled: boolean
}

export default class DownloadButton extends Component<Props> {
	constructor(props: Props) {
		super(props);
	}

	render() {
		const { style, enabled, checkedObjects } = this.props;
		const link = enabled ? getDownloadLink(checkedObjects) : undefined;
		const btnType = !enabled ? 'btn-outline-secondary' : 'btn-warning';
		const className = `btn ${btnType} ${enabled ? "" : "disabled"}`;
		const btnStyle: CSSProperties = enabled ? {} : { pointerEvents: 'auto', cursor: 'not-allowed' };

		return (
			<div style={style}>
				<a href={link} id="download-button" className={className} style={btnStyle}>
					Download
				</a>
			</div>
		);
	}
}

const getDownloadLink = (objs: string[]): string => {
	const dobjIds = objs.map(dobj => dobj.split('/').pop());

	if (dobjIds.length == 1) {
		return `/objects/${dobjIds[0]}`;
	} else {
		const ids = encodeURIComponent(JSON.stringify(dobjIds));
		const fileName = encodeURIComponent('My data cart');

		return `/objects?ids=${ids}&fileName=${fileName}`;
	}
};