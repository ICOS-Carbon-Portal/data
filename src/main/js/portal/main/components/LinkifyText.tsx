import * as React from 'react';
import LinkifyIt from 'linkify-it';

const linkifyIt = LinkifyIt();
interface Props {
	text: string,
	style?: object
}

export const LinkifyText: React.FunctionComponent<Props> = ({text, style}) => {
	const matches = linkifyIt.match(text);

	if (matches === null) return <div>{text}</div>;

	const txtLinksSpliced = [text.slice(0, matches[0].index)].concat(matches.map((lnk, idx) => {
		const end = idx + 1 >= matches.length ? undefined : matches[idx + 1].index;
		return text.slice(lnk.lastIndex, end);
	}));

	return (
		<div style={style}>{
			txtLinksSpliced.map((txt, idx) =>
				<React.Fragment key={'linkified_' + idx}>
					<span>{txt}</span>
					{idx < matches.length &&
					<a href={matches[idx].url} target="_blank">{matches[idx].text}</a>
					}
				</React.Fragment>
			)
		}</div>
	);
};
