import React, { Component, PropTypes } from 'react';

const textMargin = 3;

export default class LegendAxis extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const props = this.props;

		return (
			<svg ref="axis" className="axis" width={props.width + props.margin * 2} height={props.height + textMargin} style={{display: 'block'}}>{
				props.suggestedTickLocations
					? props.suggestedTickLocations.map((tick, idx) => {
						const tickVal = props.valueMaker(tick) == 1
							? 1
							: props.valueMaker(tick).toExponential(0)

						return (
							<g key={'g' + idx}>
								<line x1={tick + props.margin} y1={0} x2={tick + props.margin} y2={10} stroke="black" strokeWidth="2" />
								<text x={tick + props.margin} y={props.height + textMargin} textAnchor="middle">{tickVal}</text>
							</g>
						);
					})
					: null
			}</svg>
		);
	}
}