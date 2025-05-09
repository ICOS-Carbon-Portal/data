import React, {CSSProperties} from 'react';

interface Props {
	enabled: boolean
	title: string
	options: string[]
	firstSelected: boolean
	toggle: (andOperator: boolean) => void
}

export default function FilterToggleButton({enabled, title, firstSelected, options, toggle}: Props) {
	if (!enabled)
		return null;
		
	const style: CSSProperties = {
		border: "none",
		color: 'black',
		backgroundColor: 'white',
		cursor: 'pointer',
		padding: "0",
		marginBottom: "2px",
	};


	const defaultToggleStyle: CSSProperties = {
		border: 'solid darkgray thin',
		padding: "1px 3px",
		fontWeight: "bold",
		fontSize: "10px",
		textTransform: "uppercase",
		margin: "0",
	};

	const radius = "3px";

	const toggleStyles: CSSProperties[] = [
		{...defaultToggleStyle, borderRadius: `${radius} 0 0 ${radius}`, backgroundColor: firstSelected ? "white" : "lightgray", fontWeight: firstSelected ? "bold" : "normal"},
		{...defaultToggleStyle, borderRadius: `0 ${radius} ${radius} 0`, backgroundColor: firstSelected ? "lightgray" : "white", fontWeight: firstSelected ? "normal" : "bold"},
	];

	return <button type="button" style={style} title={title} onClick={() => toggle(!firstSelected)}>
		<span style={{...defaultToggleStyle, ...toggleStyles[0]}}>{options[0]}</span>
		<span style={{...defaultToggleStyle, ...toggleStyles[1]}}>{options[1]}</span>
	</button>;
}
