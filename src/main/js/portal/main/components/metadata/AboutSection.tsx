import React from 'react';
import { formatBytes } from '../../utils';
import { metadataRow } from '../../containers/Metadata';
import { MetaDataObject } from '../../models/State';
import { L3SpecificMeta } from '../../../../common/main/metacore';

interface AboutSectionProps {
  metadata: MetaDataObject,
  projectLabel: string
}

const AboutSection = (props: AboutSectionProps) => {
  const { metadata, projectLabel } = props;

  return(
    <React.Fragment>
      <h2>About</h2>
      {(metadata.specificInfo as L3SpecificMeta).description &&
        metadataRow("Description", (metadata.specificInfo as L3SpecificMeta).description!, true)
      }
      {metadata.doi &&
        metadataRow("DOI", doiLink(metadata.doi))
      }
      {metadata.pid &&
        metadataRow("PID", <a href={`https://hdl.handle.net/${metadata.pid}`}>{metadata.pid}</a>)
      }
      {metadata.specification.project.label && metadataRow(projectLabel, metadata.specification.project.label)}
      {metadata.specification.self.label && metadataRow("Type", metadata.specification.self.label)}
      {metadataRow("Level", metadata.specification.dataLevel.toString())}
      {metadataRow("File name", metadata.fileName)}
      {metadata.size !== undefined && metadataRow("Size", formatBytes(metadata.size, 0))}
      <br />
    </React.Fragment>
  )
}

const doiLink = (doi: string) => (
  <span>
    <a href={`https://doi.org/${doi}`}>{doi}</a>&nbsp;
    (<a target="_blank" href={`https://search.datacite.org/works/${doi}`}>metadata</a>)
  </span>
);

export default AboutSection;