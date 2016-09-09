import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import {getLegend} from '../models/colorMaker';
import LegendAxis from './LegendAxis.jsx';

const margin = 20;
const stripeHeight = 20;

export default class NetCDFLegend extends Component {
	constructor(props) {
		super(props);
		this.state = {
			suggestedTickLocations: null,
			valueMaker: null
		}
	}

	componentDidMount(){
		const width = this.props.width;
		const height = this.props.height;
		const canvas = ReactDOM.findDOMNode(this.refs.canvas);
		const ctx = canvas.getContext('2d');

		const {colorMaker, valueMaker, suggestedTickLocations} = getLegend(0, width - 1);
		this.setState({suggestedTickLocations, valueMaker});

		for(let i = 0; i < width; i++){
			let color = colorMaker(i);
			ctx.strokeStyle = 'rgba(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ',' + Math.round(color[3]) + ')';
			ctx.beginPath();
			ctx.moveTo(i + margin, 0);
			ctx.lineTo(i + margin, height);
			ctx.stroke();
		}

		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;
		ctx.strokeRect(margin - 0.5, 0.5, width, height - 1);
	}

	render() {
		const state = this.state;
		const props = this.props;

		return (
			<div className="legend" style={{position: 'relative'}}>
				<canvas ref="canvas" width={props.width + margin * 2} height={stripeHeight} style={{display: 'block'}}></canvas>
				<LegendAxis
					width={props.width}
					height={props.height}
					margin={margin}
					suggestedTickLocations={state.suggestedTickLocations}
					valueMaker={state.valueMaker}
				/>
			</div>
		);
	}
}