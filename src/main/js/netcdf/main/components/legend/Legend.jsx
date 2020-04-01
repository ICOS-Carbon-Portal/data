import React, { Component } from 'react';
import LegendText from './LegendText';
import LegendAxis from './LegendAxis';
import RangeSlider from "./RangeSlider";

export default class Legend extends Component {
	constructor(props) {
		super(props);

		this.state = {length: 0};
	}

	componentDidMount() {
		const length = this.getLength(this.props);
		this.updateLegend(length);
	}

	getLength(props){
		return props.horizontal
			? this.legendDiv.getBoundingClientRect().width - 2 * props.margin
			: props.containerHeight - 2 * props.margin;
	}

	componentDidUpdate(prevProps, prevState){
		const length = this.getLength(this.props);

		if (prevProps.legendId !== this.props.legendId || length !== prevState.length) {
			this.updateLegend(length);
		}
	}

	updateLegend(length) {
		this.setState({length});
		this.renderLegend(length);
	}

	renderLegend(length){
		const props = this.props;
		const {colorMaker} = props.getLegend(0, length - 1);

		const width = props.canvasWidth;

		const canvas = this.canvas;

		canvas.width = props.horizontal	? length + props.margin * 2	: width;
		canvas.height = props.horizontal ? width : length + props.margin * 2;

		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let i = 0; i < length; i++) {
			let color = colorMaker(i);
			ctx.strokeStyle = 'rgba(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ',' + Math.round(color[3]) + ')';
			ctx.beginPath();
			if (props.horizontal) {
				ctx.moveTo(i + props.margin, 0);
				ctx.lineTo(i + props.margin, width);
			} else {
				ctx.moveTo(0, this.state.length - i + props.margin);
				ctx.lineTo(width, this.state.length - i + props.margin);
			}
			ctx.stroke();
		}

		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;
		if (props.horizontal) {
			ctx.strokeRect(props.margin - 0.5, 0.5, length, width - 1);
		} else {
			ctx.strokeRect(0, props.margin - 0.5, width, length);
		}

		// this.rangeSlider.init(canvas, props.margin, 600);
	}

	render() {
		const length = this.state.length;

		const props = this.props;
		const legendDivStyle = props.horizontal
			? {position: 'relative', marginTop: 2}
			: {position: 'relative', marginLeft: 2};

		const {valueMaker, suggestedTickLocations} = props.getLegend(0, length - 1);

		return (
			<div ref={div => this.legendDiv = div} style={legendDivStyle}>
				<LegendText
					horizontal={props.horizontal}
					length={length}
					width={props.canvasWidth}
					margin={props.margin}
					legendText={props.legendText}
				/>
				<canvas	ref={div => this.canvas = div} />
				<LegendAxis
					allowRanges={props.allowRanges}
					horizontal={props.horizontal}
					length={length}
					width={props.canvasWidth}
					margin={props.margin}
					suggestedTickLocations={suggestedTickLocations}
					decimals={props.decimals}
					valueMaker={valueMaker}
					rangeFilterChanged={props.rangeFilterChanged}
				/>
			</div>
		);
	}
}
