import React from 'react';
import { formatBytes } from '../../utils';
import { metadataRow } from '../../containers/Metadata';
import { MetaDataObject } from '../../models/State';

interface ContentSectionProps {
	metadata: MetaDataObject
}

const ContentSection = (props: ContentSectionProps) => {
	const { metadata } = props;

	return (
		<React.Fragment>
			{metadata.specification.self.label && metadataRow("Type", metadata.specification.self.label)}
			{metadataRow("Level", metadata.specification.dataLevel.toString())}
			{metadata.specification.datasetSpec?.resolution && metadataRow("Temporal resolution", metadata.specification.datasetSpec.resolution)}
			{metadataRow("File name", <span style={{ wordBreak: 'break-word' }}>{metadata.fileName}</span>)}
			{metadata.size !== undefined && metadataRow("Size", formatBytes(metadata.size, 0))}
			<br />
		</React.Fragment>
	);
};

export default ContentSection;