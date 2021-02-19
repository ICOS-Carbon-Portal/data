import React from 'react';
import { metadataRow } from '../../containers/Metadata';
import { MetaDataObject } from '../../models/State';
import { L3SpecificMeta, PlainStaticObject } from '../../../../common/main/metacore';
import { LinkifyText } from '../LinkifyText';

interface AboutSectionProps {
	metadata: MetaDataObject,
	projectLabel: string,
	handleViewMetadata: (doj: string) => void
}

const AboutSection = (props: AboutSectionProps) => {
	const { metadata, projectLabel } = props;
	const prevVersions = Array.isArray(metadata.previousVersion)
		? metadata.previousVersion
		: metadata.previousVersion ? [metadata.previousVersion] : [];
	const description = (metadata.specificInfo as L3SpecificMeta).description
		?? (metadata.specification.self.comments && metadata.specification.self.comments.join('\n'));

	return (
		<React.Fragment>
			<h2 style={{ fontSize: 28 }}>About</h2>
			{metadata.doi &&
				metadataRow("DOI", doiLink(metadata.doi))
			}
			{metadata.pid &&
				metadataRow("PID", <a href={`https://hdl.handle.net/${metadata.pid}`}>{metadata.pid}</a>)
			}
			{metadata.specification.theme.self.label &&
				metadata.specification.project.self.label && metadataRow("Theme", metadata.specification.theme.self.label)
			}
			{metadata.specification.project.self.label && metadataRow(projectLabel, metadata.specification.project.self.label)}
			{/* Preserve line breaks in description with white-space: pre-line  */}
			{description &&
				metadataRow("Description", <LinkifyText text={description} style={{ whiteSpace: 'pre-line' }} />)
			}
			{metadata.parentCollections.length > 0 &&
				metadataRow("Part of",
					metadata.parentCollections.map((collection, i) => {
						return (<div key={'key_' + i}><a href={collection.uri}>{collection.label}</a></div>)
					}))
			}
			{metadata.references.citationString &&
				<React.Fragment>
					{metadataRow("Citation", metadata.references.citationString)}
				</React.Fragment>
			}
			{prevVersions.map((previousVersion, i) =>
				<React.Fragment key={"key_" + i}>
					{metadataRow(
						"Previous version",
						<a onClick={() => props.handleViewMetadata(previousVersion)} style={{ cursor: 'pointer' }}>View previous version</a>
					)}
				</React.Fragment>
			)}
			{metadata.specification.documentation && metadata.specification.documentation.length > 0 &&
				<React.Fragment>
					{metadataRow("Documentation", documentationLinks(metadata.specification.documentation))}
				</React.Fragment>
			}
		</React.Fragment>
	);
};

const doiLink = (doi: string) => (
	<span>
		<a href={`https://doi.org/${doi}`}>{doi}</a>&nbsp;
		(<a target="_blank" href={`https://search.datacite.org/works/${doi}`}>metadata</a>)
	</span>
);

const documentationLinks = (documentation: PlainStaticObject[]) => {
	return documentation.map((doc, i) =>
		<React.Fragment key={"key_" + i}>
			<a href={doc.res}>{doc.name}</a>
			{i != documentation.length - 1 && <br />}
		</React.Fragment>
	);
};

export default AboutSection;
