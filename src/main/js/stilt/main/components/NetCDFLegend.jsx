import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import LegendAxis from './LegendAxis.jsx';

export default class NetCDFLegend extends Component {
	constructor(props) {
		super(props);
		this.state = {
			colorMaker: null,
			suggestedTickLocations: null,
			valueMaker: null,
			length: 0,
			renderCanvas: true
		}
	}

	componentDidMount() {
		if (!this.props.horizontal) window.addEventListener('resize', this.updateApp.bind(this));
		this.updateApp();
	}

	updateApp(){
		const legendDiv = ReactDOM.findDOMNode(this.refs.legendDiv).getBoundingClientRect();
		const legendDivWidth = legendDiv.width;
		const length = this.props.horizontal
			? legendDivWidth - 2 * this.props.margin
			: this.props.containerHeight - 2 * this.props.margin;

		this.setState({length});
		this.updateLegendFunctions(length);
	}

	updateLegendFunctions(length){
		const {colorMaker, valueMaker, suggestedTickLocations} = this.props.getLegend(0, length - 1);
		this.setState({colorMaker, suggestedTickLocations, valueMaker, renderCanvas: true});
	}

	componentWillUnmount(){
		if (!this.props.horizontal) window.removeEventListener('resize', this.updateApp);
	}

	componentDidUpdate(props){
		const state = this.state;

		if (state.renderCanvas) {
			const length = state.length;
			const width = props.canvasWidth;
			const canvas = ReactDOM.findDOMNode(this.refs.canvas);
			const ctx = canvas.getContext('2d');

			for (let i = 0; i < length; i++) {
				let color = state.colorMaker(i);
				ctx.strokeStyle = 'rgba(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ',' + Math.round(color[3]) + ')';
				ctx.beginPath();
				if (props.horizontal) {
					ctx.moveTo(i + props.margin, 0);
					ctx.lineTo(i + props.margin, width);
				} else {
					ctx.moveTo(0, state.length - i + props.margin);
					ctx.lineTo(width, state.length - i + props.margin);
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

			this.setState({renderCanvas: false});
		}
	}

	render() {
		const state = this.state;
		const props = this.props;
		const canvasWidth = props.horizontal
			? state.length + props.margin * 2
			: props.canvasWidth;
		const canvasHeight = props.horizontal
			? props.canvasWidth
			: state.length + props.margin * 2;
		const legendDivStyle = props.horizontal
			? {marginTop: 2}
			: {marginLeft: 2};

		return (
			<div ref="legendDiv" style={legendDivStyle}>
				<canvas
					ref="canvas"
					width={canvasWidth}
					height={canvasHeight}
				/>
				<LegendAxis
					horizontal={props.horizontal}
					length={state.length}
					width={props.canvasWidth}
					margin={props.margin}
					suggestedTickLocations={state.suggestedTickLocations}
					valueMaker={state.valueMaker}
				/>
			</div>
		);
	}
}