import React, { CSSProperties } from 'react';

const baseStyle = {
	transition: 'margin-right 0.5s ease-in-out',
	float: 'right'
} as CSSProperties;

type Props = {
	isOpen: boolean
	width: number
}

export const SlideIn: React.FunctionComponent<Props> = ({ isOpen, width, children }) => {
	const marginRight = isOpen ? { marginRight: 0 } : { marginRight: -width };
	const style = { ...baseStyle, ...marginRight };

	return (
		<div style={style}>
			{children}
		</div>
	);
};
