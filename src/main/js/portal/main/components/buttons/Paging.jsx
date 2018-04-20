import React from 'react';
import {StepButton} from './StepButton.jsx';

export const Paging = ({paging, requestStep}) => {
	const {offset, objCount, pageCount, isCountKnown} = paging;
	const to = offset + pageCount;
	const isForwardEnabled = isCountKnown
		? to < objCount
		: to <= objCount;

	return (
		<div className="panel-heading">
			<CountHeader objCount={objCount} isCountKnown={isCountKnown} to={to} offset={offset} />
			<div style={{display: 'inline', float: 'right'}}>
				<StepButton direction="backward" enabled={offset > 0} onStep={() => requestStep(-1)} />
				<StepButton direction="forward" enabled={isForwardEnabled} onStep={() => requestStep(1)} />
			</div>
		</div>
	);
};

const CountHeader = ({objCount, isCountKnown, to, offset}) => {
	const countTxt = !isNaN(to) && objCount
		? isCountKnown
			? `Data objects ${offset + 1} to ${to} of ${objCount}`
			: `Data objects ${offset + 1} to ${to} of more than ${objCount}`
		: <span>&nbsp;</span>;

	return <h3 className="panel-title" style={{display:'inline'}}>{countTxt}</h3>;
};
