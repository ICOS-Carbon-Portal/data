import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import LegendAxis from './LegendAxis.jsx';

export default class NetCDFLegend extends Component {
	constructor(props) {
		super(props);
		this.state = {length: 0};
	}

	componentDidMount() {
		this.updateLegend();
	}

	componentDidUpdate(props){
		this.updateLegend();
	}

	shouldComponentUpdate(nextProps, nextState){
		// console.log({rasterVal: nextProps.rasterVal});
		return nextProps.legendId != this.props.legendId || this.state.length != nextState.length || nextProps.rasterVal != this.props.rasterVal;
	}

	updateLegend() {
		const props = this.props;

		const legendDiv = ReactDOM.findDOMNode(this.refs.legendDiv).getBoundingClientRect();

		const length = props.horizontal
			? legendDiv.width - 2 * props.margin
			: props.containerHeight - 2 * props.margin;

		const thisIsInitialization = !this.state.length;
		this.setState({length});
		if (thisIsInitialization) return;

		this.renderLegend(length);
	}

	renderLegend(length){
		const props = this.props;
		const {colorMaker} = props.getLegend(0, length - 1);

		const width = props.canvasWidth;

		const canvas = ReactDOM.findDOMNode(this.refs.canvas);

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
	}

	render() {
		const length = this.state.length;

		const props = this.props;
		const legendDivStyle = props.horizontal
			? {position: 'relative', marginTop: 2}
			: {position: 'relative', marginLeft: 2};

		if(!length) return <div ref="legendDiv" style={legendDivStyle}></div>;

		const {valueMaker, pixelMaker, suggestedTickLocations} = props.getLegend(0, length - 1);
		const cursorPos = pixelMaker
			? Math.round(pixelMaker(props.rasterVal))
			: null;
		const cursorStyle = pixelMaker && props.horizontal
			? {width: 2, height: props.canvasWidth, backgroundColor: 'black', position: 'absolute', top: 0, left: props.margin + cursorPos}
			: {}

		return (
			<div ref="legendDiv" style={legendDivStyle}>
				<canvas	ref="canvas"/>
				<span style={cursorStyle} />
				<LegendAxis
					horizontal={props.horizontal}
					length={length}
					width={props.canvasWidth}
					margin={props.margin}
					suggestedTickLocations={suggestedTickLocations}
					decimals={props.decimals}
					valueMaker={valueMaker}
					legendText={props.legendText}
				/>
			</div>
		);
	}
}
