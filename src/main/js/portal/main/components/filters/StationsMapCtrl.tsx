import React, {KeyboardEvent, ReactNode} from 'react';
import { EpsgCode, getViewParams, SupportedSRIDs } from 'icos-cp-ol';
import config from '../../config';


interface OurProps {
	openStationsMap: () => void
	mapPreview: ReactNode
	srid?: SupportedSRIDs
}

const maxPreviewHeight = 300;

function previewMapAspectRatio(srid: SupportedSRIDs | undefined) {
	const epsgCode = `EPSG:${srid ?? config.olMapSettings.defaultSRID}` as EpsgCode;
	const [minX, minY, maxX, maxY] = getViewParams(epsgCode).extent;

	return (maxX - minX) / (maxY - minY);
}

export function StationsMapCtrl(props: OurProps) {
	const {openStationsMap, mapPreview, srid} = props;
	const aspectRatio = previewMapAspectRatio(srid);

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;

		event.preventDefault();
		openStationsMap();
	}

	return (
		<div className="stations-map-frame-container">
			<div
				className="stations-map-frame bg-light"
				style={{aspectRatio: String(aspectRatio), maxWidth: `${maxPreviewHeight * aspectRatio}px`}}
				role="button"
				tabIndex={0}
				title="Open the stations map"
				onClick={openStationsMap}
				onKeyDown={handleKeyDown}
			>
				{mapPreview}

				<div className="stations-map-frame-overlay">
					<span className="stations-map-expand">
						<i className="fas fa-expand-arrows-alt" aria-hidden="true" />
					</span>
				</div>
			</div>
		</div>
	);
}
