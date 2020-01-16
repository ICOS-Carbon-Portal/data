import React from 'react';
import { DataAcquisition } from '../../../../common/main/metacore';
import { metadataRow } from '../../containers/Metadata';
import { UrlStr } from '../../backend/declarations';
import { formatDateTime } from '../../utils';

interface AquisitionSectionProps {
	acquisition: DataAcquisition
}

const AcquisitionSection = (props: AquisitionSectionProps) => {
	const { acquisition } = props;

	return(
		<React.Fragment>
			<h2>Acquisition</h2>
			{acquisition.station &&
				metadataRow("Station", <a href={acquisition.station.org.self.uri}>{acquisition.station.name}</a>)
			}
			{acquisition.station && acquisition.station.responsibleOrganization &&
				metadataRow("Responsible organization",
					<a href={acquisition.station.responsibleOrganization.self.uri}>
						{acquisition.station.responsibleOrganization.name}</a>)
			}
			{acquisition.site && acquisition.site.ecosystem.label &&
				metadataRow("Ecosystem", acquisition.site.ecosystem.label)
			}
			{acquisition.interval && metadataRow("Temporal coverage", `${formatDateTime(new Date(acquisition.interval.start))}
										\u2013
										${formatDateTime(new Date(acquisition.interval.stop))}`)}
			{acquisition.instrument &&
				instrumentRow(acquisition.instrument)
			}
			{acquisition.samplingHeight &&
				metadataRow("Sampling height", `${acquisition.samplingHeight} m`)
			}
		</React.Fragment>
	);
};

const instrumentRow = (instruments: UrlStr | UrlStr[]) => {
	return (
		Array.isArray(instruments)
			? metadataRow("Instruments", instruments.map((instrument: UrlStr, index) => {
				return (
					<span key={instrument}>
						<a href={instrument}>{instrument.split('/').pop()}</a>
						{index != instruments.length - 1 && ', '}
					</span>
				);
			}))
			: metadataRow("Instrument", <a href={instruments}>{instruments.split('/').pop()}</a>)
	);
};

export default AcquisitionSection;