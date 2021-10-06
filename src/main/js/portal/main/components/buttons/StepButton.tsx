import React, {MouseEvent} from 'react';

interface Props {
	direction: 'step-forward' | 'step-backward'
	enabled: boolean
	onStep: (event: MouseEvent<HTMLDivElement>) => void
}

export const StepButton = (props: Props) => {
	const baseStyle = {display: 'inline', paddingLeft: 4, fontSize: '150%'};
	const style = props.enabled
		? Object.assign(baseStyle, {cursor: 'pointer'})
		: Object.assign(baseStyle, {opacity: 0.65});

	return (
		<div style={style} onClick={props.enabled ? props.onStep : _ => _}>
			<span className={'fas fa-' + props.direction} />
		</div>
	);
};
