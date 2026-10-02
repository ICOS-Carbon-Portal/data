import React from 'react';
import { PersistedMapPropsExtended } from '../../models/InitMap';
import StationsMap from './StationsMap';


interface OurProps {
	previewMapProps: PersistedMapPropsExtended
}

function ignoreMapProps() {}

export function StationsMapPreview({previewMapProps}: OurProps) {
	// Using srid as key forces React to recreate the map when the projection changes
	return (
		<StationsMap
			key={previewMapProps.srid}
			isPreview={true}
			persistedMapProps={previewMapProps}
			updatePersistedMapProps={ignoreMapProps}
			updateMapSelectedSRID={ignoreMapProps}
		/>
	);
}
