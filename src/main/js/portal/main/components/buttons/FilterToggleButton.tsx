import React, {CSSProperties} from 'react';
import { FilterName } from '../../config';

type ToggleOption = {
	text: string
	selected: boolean
};

interface Props {
	enabled: boolean
	filterName?: FilterName
	title: string
	baseStyle: CSSProperties
	options: ToggleOption[]
	toggle: (filterName?: FilterName) => void
}

export default function FilterToggleButton({enabled, title, filterName, baseStyle, options, toggle}: Props) {
	if (!enabled)
		return null;
		
	const style: CSSProperties = enabled 
		? {...baseStyle, border: 'solid darkgray thin', borderRadius: "5px", color: 'black', cursor:'pointer'}
		: {...baseStyle, color: 'lightgray'};
	const selectedStyle: CSSProperties = {backgroundColor: "white"}
	const deselectedStyle: CSSProperties = {backgroundColor: "lightgray"}
	const toggleStyles = options[0].selected ?
		[selectedStyle, deselectedStyle] :
		[deselectedStyle, selectedStyle];

	return <button type="button" style={style} title={title} onClick={() => toggle(filterName)}>
			<span style={toggleStyles[0]}>{options[0].text}</span>
			<span style={toggleStyles[1]}>{options[1].text}</span>
		</button>;
}
