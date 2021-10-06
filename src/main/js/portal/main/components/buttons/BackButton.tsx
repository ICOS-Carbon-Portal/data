import React from 'react';

type Props = {
	action: Function
	previousRoute: 'search'
}

export default function BackButton({ action, previousRoute }: Props) {
	return (
		<div onClick={() => action(previousRoute)}
			style={{ display: 'inline-block', cursor: 'pointer', marginBottom: 10 }}>
			<span className="fas fa-chevron-left" />
			<span style={{ marginLeft: 5 }}>Back to {previousRoute}</span>
		</div>
	);
}
