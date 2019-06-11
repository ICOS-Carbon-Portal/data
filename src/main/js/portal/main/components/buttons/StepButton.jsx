import React from 'react';

export const StepButton = props => {
	const baseStyle = {display: 'inline', paddingLeft: 4, fontSize: '150%'};
	const style = props.enabled
		? Object.assign(baseStyle, {cursor: 'pointer'})
		: Object.assign(baseStyle, {opacity: 0.65});

	return (
		<div style={style} onClick={props.enabled ? props.onStep : _ => _}>
			<span className={'glyphicon glyphicon-step-' + props.direction} />
		</div>
	);
};