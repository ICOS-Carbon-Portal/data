import React, {KeyboardEvent, ReactNode} from 'react';


interface OurProps {
	openStationsMap: () => void
	mapPreview: ReactNode
	aspectRatio: number
}

export function StationsMapCtrl(props: OurProps) {
	const {openStationsMap, mapPreview, aspectRatio} = props;

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;

		event.preventDefault();
		openStationsMap();
	}

	return (
		<div className="card">
			<div
				className="stations-map-frame bg-light"
				style={{aspectRatio: String(aspectRatio)}}
				role="button"
				tabIndex={0}
				title="Open the stations map"
				onClick={openStationsMap}
				onKeyDown={handleKeyDown}
			>
				{mapPreview}

				{/* Keeps the map underneath from consuming the click that opens the modal */}
				<div className="stations-map-frame-overlay">
					{/* The preview hides all of the map controls, so nothing else says it opens */}
					<span className="stations-map-expand">
						<i className="fas fa-expand-arrows-alt" aria-hidden="true" />
					</span>
				</div>
			</div>
		</div>
	);
}
