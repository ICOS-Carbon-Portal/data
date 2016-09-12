import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import LegendAxis from './LegendAxis.jsx';

const margin = 20;

export default class NetCDFLegend extends Component {
	constructor(props) {
		super(props);
		this.app = {
			colorMaker: null,
			suggestedTickLocations: null,
			valueMaker: null,
			width: 0,
			renderCanvas: true
		}
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const divWidth = nextProps.divWidth;

		if (divWidth > 0 && prevProps.divWidth != nextProps.divWidth) {
			const width = divWidth - 2 * margin;
			const {colorMaker, valueMaker, suggestedTickLocations} = nextProps.getLegend(0, width - 1);
			this.app = Object.assign(this.app,
				{width, colorMaker, suggestedTickLocations, valueMaker, renderCanvas: true}
			);
		}
	}

	componentDidUpdate(props){
		if (this.app.renderCanvas) {
			const app = this.app;
			const width = app.width;
			const height = props.stripeHeight;
			const canvas = ReactDOM.findDOMNode(this.refs.canvas);
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (let i = 0; i < width; i++) {
				let color = app.colorMaker(i);
				ctx.strokeStyle = 'rgba(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ',' + Math.round(color[3]) + ')';
				ctx.beginPath();
				ctx.moveTo(i + margin, 0);
				ctx.lineTo(i + margin, height);
				ctx.stroke();
			}

			ctx.strokeStyle = "black";
			ctx.lineWidth = 1;
			ctx.strokeRect(margin - 0.5, 0.5, width, height - 1);

			this.app.renderCanvas = false;
		}
	}


	render() {
		const app = this.app;
		const props = this.props;

		return (
			<div className="legend" style={{position: 'relative'}}>
				<canvas ref="canvas" width={app.width + margin * 2} height={props.stripeHeight} style={{display: 'block'}}></canvas>
				<LegendAxis
					width={app.width}
					height={props.stripeHeight}
					margin={margin}
					suggestedTickLocations={app.suggestedTickLocations}
					valueMaker={app.valueMaker}
				/>
			</div>
		);
	}
}