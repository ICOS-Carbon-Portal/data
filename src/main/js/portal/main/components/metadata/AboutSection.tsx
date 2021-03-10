import React from 'react';
import { metadataRow } from '../../containers/Metadata';
import { MetaData } from '../../models/State';
import { L3SpecificMeta, PlainStaticObject, References } from '../../../../common/main/metacore';
import { LinkifyText } from '../LinkifyText';

interface AboutSectionProps {
	metadata: MetaData,
	projectLabel: string,
	handleViewMetadata: (doj: string) => void
	failWithError: (err: Error) => void
}

const AboutSection = (props: AboutSectionProps) => {
	const { metadata, projectLabel, failWithError } = props;
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

			<CitationRow references={metadata.references} citationStyle="citationString" />
			<CitationRow references={metadata.references} citationStyle="citationBibTex" failWithError={failWithError} />
			<CitationRow references={metadata.references} citationStyle="citationRis" failWithError={failWithError} />

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

type CitationStyle = keyof Pick<References, 'citationString' | 'citationBibTex' | 'citationRis'>
type Citation = {
	references: References,
	citationStyle: CitationStyle
	failWithError?: (err: Error) => void
}

const CitationRow = ({ references, citationStyle, failWithError }: Citation) => {
	const citationTxt = references[citationStyle];

	if (citationTxt === undefined)
		return null;
	
	const citation = citationStyle === 'citationString'
		? citationTxt
		: <StructuredCitation citation={citationTxt} citationStyle={citationStyle} failWithError={failWithError} />;

	return metadataRow("Citation", citation);
};

const StructuredCitation = ({ citation, citationStyle, failWithError }: { citation: string, citationStyle: CitationStyle, failWithError?: (err: Error) => void }) => {
	const lnkTxt = citationStyle.replace("citation", "");
	const title = `Copy ${lnkTxt} citation to clipboard`;

	return (
		<details>
			<summary style={{ cursor: 'pointer', color: '#0a96f0' }}>{lnkTxt}</summary>
			<div style={{ display: 'block' }}>
				<div>
					<button className="btn btn-default glyphicon glyphicon-copy" onClick={() => copyToClipboard(citation, failWithError)} style={{ marginBottom: 5 }} title={title} />
				</div>
				<pre id={citationStyle} style={{ display: 'inline-block', maxWidth: '100%' }}>{citation}</pre>
			</div>
		</details>
	);
};

const copyToClipboard = async (citation: string, failWithError?: (err: Error) => void) => {
	try {
		await navigator.clipboard.writeText(citation);
	} catch {
		if (failWithError)
			failWithError(new Error("Could not copy citation text to clipboard. You have to do it manually."));
	}
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
