import React, { Component } from 'react';

const textMargin = 3;
const tickLength = 10;

export default class LegendAxis extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const props = this.props;
		const width = props.horizontal
			? props.length + props.margin * 2
			: props.width + 50 + textMargin;
		const height = props.horizontal
			? props.width + textMargin
			: props.length + props.margin * 2;
		const style = props.horizontal
			? {position: 'relative', top: -5, fontSize: 12}
			: {fontSize: 12};
		const decimals = props.decimals
			? props.decimals
			: 0;

		return (
			<svg className="axis" width={width} height={height} style={style}>{
				props.suggestedTickLocations
					? props.suggestedTickLocations.map((tick, idx) => {
						const tickVal = props.valueMaker(tick) == 1
							? 1
							: props.valueMaker(tick).toExponential(decimals)

						return (
							props.horizontal
								? <g key={'g' + idx}>
									<line x1={tick + props.margin} y1={0} x2={tick + props.margin} y2={tickLength} stroke="black" strokeWidth="2" />
									<text x={tick + props.margin} y={props.width + textMargin} textAnchor="middle">{tickVal}</text>
								</g>
								: <g key={'g' + idx}>
									<line y1={tick + props.margin} x1={0} y2={tick + props.margin} x2={tickLength} stroke="black" strokeWidth="2" />
									<text y={height - tick - props.margin} x={tickLength + textMargin} textAnchor="start" dy="0.3em">{tickVal}</text>
								</g>
						);
					})
					: null
				}
			</svg>
		);
	}
}