import React from 'react';
import {StepButton} from './StepButton';
import P from "../../models/Paging";

interface Paging {
	type: 'header' | 'footer'
	paging: P
	requestStep: (direction: number) => void | undefined
}

export const Paging = ({type, paging, requestStep}: Paging) => {
	const {offset, objCount, pageCount, isCountKnown} = paging;
	const to = offset + pageCount;
	const isForwardEnabled = isCountKnown
		? to < objCount
		: to <= objCount;

	if (type === "header") {
		return (
			<div className="panel-heading">
				<CountHeader objCount={objCount} isCountKnown={isCountKnown} to={to} offset={offset}/>
				<div style={{display: 'inline', float: 'right', position: 'relative', top: -3}}>
					<StepButton direction="backward" enabled={offset > 0} onStep={() => requestStep(-1)}/>
					<StepButton direction="forward" enabled={isForwardEnabled} onStep={() => requestStep(1)}/>
				</div>
			</div>
		);
	} else if (type === "footer") {
		return (
			<div className="panel-footer">
				<div style={{textAlign: 'right', lineHeight: '1rem'}}>
					<StepButton direction="backward" enabled={offset > 0} onStep={() => {window.scrollTo(0, 0);requestStep(-1)}} />
					<StepButton direction="forward" enabled={isForwardEnabled} onStep={() => {window.scrollTo(0, 0);requestStep(1)}} />
				</div>
			</div>
		);
	} else {
		return null;
	}
};

interface CountHeader {
	objCount: any
	isCountKnown: any
	to: any
	offset: any
}

const CountHeader = ({objCount, isCountKnown, to, offset}: CountHeader) => {
	const countTxt = !isNaN(to) && !isNaN(objCount)
		? isCountKnown
			? `Data objects ${objCount === 0 ? 0 : offset + 1} to ${to} of ${objCount}`
			: `Data objects ${offset + 1} to ${to} of more than ${objCount}`
		: <span>&nbsp;</span>;

	return <h3 className="panel-title" style={{display:'inline'}}>{countTxt}</h3>;
};
