import React from 'react';


interface OurProps {
	isCompact: boolean
	setCompact: (isCompact: boolean) => void
}

export function ResultViewSwitch(props: OurProps) {
	const {isCompact, setCompact} = props;

	return (
		<div className="btn-group" role="group" aria-label="Toggle between default and compact search results">
			<input
				type="radio"
				className="btn-check"
				name="result-view"
				id="result-view-default"
				autoComplete="off"
				checked={!isCompact}
				onChange={() => setCompact(false)}
			/>
			<label className="btn btn-outline-secondary d-flex align-items-center py-1" htmlFor="result-view-default" title="View default results">
				<i className="fas fa-list me-2" />
				Default
			</label>

			<input
				type="radio"
				className="btn-check"
				name="result-view"
				id="result-view-compact"
				autoComplete="off"
				checked={isCompact}
				onChange={() => setCompact(true)}
			/>
			<label className="btn btn-outline-secondary d-flex align-items-center py-1" htmlFor="result-view-compact" title="View compact results">
				<i className="fas fa-table me-2" />
				Compact
			</label>
		</div>
	);
}
