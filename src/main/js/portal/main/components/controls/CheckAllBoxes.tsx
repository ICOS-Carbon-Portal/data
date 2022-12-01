import React, { useEffect, useRef } from 'react';
import CheckBtn from '../buttons/CheckBtn';


type Props = {
	checkCount: number
	totalCount: number
	onChange: () => void
	disabled?: boolean
}

export default function CheckAllBoxes({ checkCount, totalCount, onChange, disabled }: Props) {
	const areAllChecked = checkCount > 0;
	const checkAllBoxesTitle = checkCount > 0 ? "Select none" : "Select all";
	const checkRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (checkRef.current !== null) {
			checkRef.current.checked = areAllChecked
			checkRef.current.indeterminate = !(checkCount === 0 || checkCount === totalCount)
		}
	})

	return (
		<div className='py-2 pe-2'>
			<label style={{ margin: -5, padding: 5 }}>
				<CheckBtn
					checkRef={checkRef}
					onClick={onChange}
					isChecked={areAllChecked}
					checkboxDisabled={disabled}
					title={checkAllBoxesTitle}
				/>
			</label>
		</div>
	);
}
