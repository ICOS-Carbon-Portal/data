import React, { CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';

type Props = {
	url?: UrlStr
	openInNewTab?: boolean
	iconStyle?: CSSProperties
	title?: string
}

const defaultIconStyle: CSSProperties = {
	color: 'black',
	fontSize: 13
}

export default function CollectionBtn({ url, openInNewTab = true, iconStyle = {}, title }: Props) {
	const icon = <span className="fas fa-folder-open" style={{ ...defaultIconStyle, ...iconStyle }} title={title ?? "Part of collection"} />;

	if (url === undefined)
		return icon;

	return (
		<a href={url} target={openInNewTab ? '_blank' : '_self'}>
			{icon}
		</a>
	);
}
