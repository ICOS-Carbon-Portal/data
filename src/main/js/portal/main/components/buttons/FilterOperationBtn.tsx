import React, {CSSProperties} from 'react';
import { FilterName } from '../../config';

interface Props {
	enabled: boolean
	filterName?: FilterName
	title: string
	baseStyle: CSSProperties
	iconCls: string
	action: (filterName?: FilterName) => void
}

export default function FilterOperationBtn({enabled, title, filterName, baseStyle, iconCls, action}: Props) {
	if (!enabled)
		return null;
		
	const style: CSSProperties = enabled 
		? {...baseStyle, color: 'black', cursor:'pointer'}
		: {...baseStyle, color: 'lightgray'};

	return <span className={iconCls} style={style} title={title} onClick={() => action(filterName)} />;
}
