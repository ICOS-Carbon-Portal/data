import React from 'react';
import { metadataRow } from '../../containers/Metadata';
import { MetaDataWStats } from '../../models/State';

interface OurProps {
	metadata: MetaDataWStats
}

const StatsSection = (props: OurProps) => {
	const { metadata } = props;

	return (
		<>
			<h2 style={{ fontSize: 28 }}>Statistics</h2>
			{metadataRow("Download count", metadata.downloadCount + '')}
			{metadataRow("Preview count", metadata.previewCount + '')}
		</>
	);
};

export default StatsSection;