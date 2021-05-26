import React, { CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';

type Props = {
	url: UrlStr
	openInNewTab?: boolean
	iconStyle?: CSSProperties
}

const defaultIconStyle: CSSProperties = {
	color: 'black',
	fontSize: 13
}

export default function CollectionBtn({ url, openInNewTab = true, iconStyle = {} }: Props) {
	return (
		<a href={url} target={openInNewTab ? '_blank' : '_self'}>
			<span className="glyphicon glyphicon-folder-open" style={{ ...defaultIconStyle, ...iconStyle }} title="Part of collection" />
		</a>
	);
}
