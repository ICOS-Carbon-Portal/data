import React, { CSSProperties } from 'react';
import CheckBtn from '../buttons/CheckBtn';


type Props = {
	checkCount: number
	totalCount: number
	onChange: () => void
	disabled?: boolean
}

export default function CheckAllBoxes({ checkCount, totalCount, onChange, disabled }: Props) {
	const areAllChecked = checkCount > 0;
	const checkAllBoxesStyle = {float: 'left', width: 40, margin: '4px'} as CSSProperties;
	if (!(checkCount === 0 || checkCount === totalCount)){
		Object.assign(checkAllBoxesStyle, {opacity: 0.5});
	}
	const checkAllBoxesTitle = checkCount > 0 ? "Select none" : "Select all";

	return (
		<div style={checkAllBoxesStyle}>
			<CheckBtn
				onClick={onChange}
				isChecked={areAllChecked}
				checkboxDisabled={disabled}
				title={checkAllBoxesTitle}
			/>
		</div>
	);
}
