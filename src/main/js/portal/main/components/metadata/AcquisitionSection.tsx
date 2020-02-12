import React from 'react';
import { DataAcquisition } from '../../../../common/main/metacore';
import { metadataRow } from '../../containers/Metadata';
import { UrlStr } from '../../backend/declarations';
import {formatDateTime, getLastSegmentInUrl} from '../../utils';

interface AquisitionSectionProps {
	acquisition: DataAcquisition
	timezone: { offset: number, label: string}
}

const AcquisitionSection = (props: AquisitionSectionProps) => {
	const { acquisition, timezone } = props;

	return(
		<React.Fragment>
			<h2 style={{ fontSize: 28 }}>Acquisition</h2>
			{acquisition.site && acquisition.site.location?.label &&
				metadataRow("Location", acquisition.site.location?.label)
			}
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
			{acquisition.interval && metadataRow(`Temporal coverage (${timezone.label})`, `${formatDateTime(new Date(acquisition.interval.start), timezone.offset)}
										\u2013
										${formatDateTime(new Date(acquisition.interval.stop), timezone.offset)}`)}
			{acquisition.instrument &&
				instrumentRow(acquisition.instrument)
			}
			{acquisition.samplingHeight &&
				metadataRow("Sampling height", `${acquisition.samplingHeight} m`)
			}
			{acquisition.station.org.email &&
				metadataRow("Contact", <a href={emailLink(acquisition.station.org.email)}>{acquisition.station.org.email}</a>)
			}
			<br />
		</React.Fragment>
	);
};

const instrumentRow = (instruments: UrlStr | UrlStr[]) => {
	return (
		Array.isArray(instruments)
			? metadataRow("Instruments", instruments.map((instrument: UrlStr, index) => {
				return (
					<span key={instrument}>
						<a href={instrument}>{getLastSegmentInUrl(instrument)}</a>
						{index != instruments.length - 1 && ', '}
					</span>
				);
			}))
			: metadataRow("Instrument", <a href={instruments}>{getLastSegmentInUrl(instruments)}</a>)
	);
};

const emailLink = (email: string) => {
	return `mailto:${email}`;
};

export default AcquisitionSection;
