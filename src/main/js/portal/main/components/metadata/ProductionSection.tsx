import React from 'react';
import { DataProduction, Agent, Organization, Person } from '../../../../common/main/metacore';
import { metadataRow } from '../../containers/Metadata';
import { formatDateTime } from '../../utils';

interface ProductionSectionProps {
	production: DataProduction
}

const ProductionSection = (props: ProductionSectionProps) => {
	const { production } = props;

	return(
		<React.Fragment>
			<h2>Production</h2>
			{metadataRow("Made by", creatorLink(production.creator))}
			<Contributors contributors={production.contributors} />
			{production.host &&
				metadataRow("Host organization", <a href={production.host.self.uri}>{production.host.name}</a>)
			}
			{production.comment && metadataRow("Comment", production.comment)}
			{metadataRow("Creation date", formatDateTime(new Date(production.dateTime)))}
		</React.Fragment>
	);
};

const creatorLink = (creator: Agent) => {
	return (creator as Organization).name
		? <a href={creator.self.uri}>{(creator as Organization).name}</a> :
		<a href={creator.self.uri}>{(creator as Person).firstName} {(creator as Person).lastName}</a>;
};

interface ContributorsProps {
	contributors: Agent[]
}

const Contributors = (props: ContributorsProps) => (
	<React.Fragment>
		{props.contributors.length > 0 && metadataRow("Contributors", props.contributors.map((contributor, index) => {
			const name = (contributor as Organization).name
				? (contributor as Organization).name
				: `${(contributor as Person).firstName} ${(contributor as Person).lastName}`;
			return (
				<span key={contributor.self.uri}>
					<a href={contributor.self.uri}>{name}</a>
					{index != props.contributors.length - 1 && ', '}
				</span>);
		}))}
	</React.Fragment>
);

export default ProductionSection;