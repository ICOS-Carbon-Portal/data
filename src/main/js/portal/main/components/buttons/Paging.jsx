import React from 'react';
import {StepButton} from './StepButton.jsx';

export const Paging = ({paging, showCount, requestStep}) => {
	const {offset, limit, objCount} = paging;
	const to = Math.min(offset + limit, objCount);
	const objCountStyle = showCount
		? {display: 'inline'}
		: {display: 'inline', opacity: 0};

	return (
		<div className="panel-heading">
			<h3 style={objCountStyle} className="panel-title">Data objects {offset + 1} to {to} of {objCount}</h3>
			<div style={{display: 'inline', float: 'right'}}>
				<StepButton direction="backward" enabled={offset > 0} onStep={() => requestStep(-1)} />
				<StepButton direction="forward" enabled={to < objCount} onStep={() => requestStep(1)} />
			</div>
		</div>
	);
};