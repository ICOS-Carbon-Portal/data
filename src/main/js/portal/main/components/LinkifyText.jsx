import React, {Fragment} from "react";
import LinkifyIt from 'linkify-it';


const linkifyIt = LinkifyIt();

export const LinkifyText = ({children, style}) => {
	const matches = linkifyIt.match(children);

	if (matches === null) return <div>{children}</div>;

	const txtLinksSpliced = [children.slice(0, matches[0].index)].concat(matches.map((lnk, idx) => {
		const end = idx + 1 >= matches.length ? undefined : matches[idx + 1].index;
		return children.slice(lnk.lastIndex, end);
	}));

	return (
		<div style={style}>{
			txtLinksSpliced.map((txt, idx) =>
				<Fragment key={'linkified_' + idx}>
					<span>{txt}</span>
					{idx < matches.length &&
					<a href={matches[idx].url} target="_blank">{matches[idx].text}</a>
					}
				</Fragment>
			)
		}</div>
	);
};