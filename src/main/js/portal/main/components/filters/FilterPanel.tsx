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
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">
					<span>{header}</span>
					{helpItemName && 
						<HelpButton
							name={helpItemName}
							title="Click to toggle help"
						/>
					}
				</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{children}
				</div>
			</Slider>
		</div>
	);
};
