import React, { Component } from 'react';

const textHeight = 17;

export default class LegendText extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const props = this.props;
		const width = props.horizontal
			? props.length + props.margin * 2
			: 5 + textHeight;
		const height = props.horizontal
			? 5 + textHeight
			: props.length + props.margin * 2;
		const style = props.horizontal
			? {position: 'relative', top: -5}
			: {marginRight: 4};

		return (
			<svg className="legend-text" width={width} height={height} style={style}>{
				props.horizontal
					? null
					: <text x={textHeight} y={height / 2} textAnchor="middle" fontSize={'1.2em'} transform={"rotate(270," + textHeight + "," + height / 2 + ")"}>
					{props.legendText}
				</text>
			}</svg>
		);
	}
}