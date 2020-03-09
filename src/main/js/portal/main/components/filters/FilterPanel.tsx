import React from 'react';
import Slider from "../ui/Slider";

interface OurProps {
	header: string
	startCollapsed?: boolean
}

export const FilterPanel: React.FunctionComponent<OurProps> = props => {
	const {header, children, startCollapsed = false} = props;

	return (
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">{header}</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{children}
				</div>
			</Slider>
		</div>
	);
};
