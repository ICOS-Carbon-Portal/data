import React from 'react';
import HelpButton from '../../containers/help/HelpButton';
import { HelpItemName } from '../../models/HelpStorage';
import Slider from "../ui/Slider";

interface OurProps {
	header: string
	helpItemName?: HelpItemName
	startCollapsed?: boolean
}

export const FilterPanel: React.FunctionComponent<OurProps> = props => {
	const { header, children, helpItemName, startCollapsed = false} = props;

	return (
		<div className="card rounded-0">
			<h5 className="card-header">
				<span>{header}</span>
				{helpItemName && 
					<HelpButton
						name={helpItemName}
						title="Click to toggle help"
					/>
				}
			</h5>

			<Slider startCollapsed={startCollapsed}>
				<div className="card-body" style={{paddingTop:0}}>
					{children}
				</div>
			</Slider>
		</div>
	);
};
