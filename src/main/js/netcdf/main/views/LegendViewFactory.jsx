import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import MapUtils from './MapUtils.js';
import Utils from '../Utils.js';

const margin = 20;
const stripeHeight = 20;

class Legend extends React.Component {
	constructor(props){
		super(props);
	}

	componentDidMount(){
		// this.unsubscribe = highlightedValueAction.listen(this.highlightedValueHandler);
	}

	componentWillUnmount(){
		// this.unsubscribe();
	}

	highlightedValueHandler(value){
		const markerPosition = !this.scale || Utils.isUndefinedOrNull(value.value)
			? null
			: this.scale(value.value);
		// markerPositionAction(markerPosition);
	}

	componentDidUpdate(){
		const min = this.state.raster.stats.min;
		const max = this.state.raster.stats.max;
		const gamma = this.state.gamma;
		const colorMaker = MapUtils.getColorMaker(min, max, gamma);
		const width = this.props.width;
		const height = this.props.height;
		var color;

		this.scale = d3.scale.linear();
		this.scale = (min < 0 && max > 0)
			? this.scale.domain([min, 0, max]).range([0, (width - 1) / 2 , width - 1])
			: this.scale.domain([min, max]).range([0, width - 1]);

		const canvas = ReactDOM.findDOMNode(this.refs.canvas);
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = 'white';
		ctx.strokeStyle = 'black';
		ctx.fillRect(margin, 0, width, height);
		ctx.strokeRect(margin, 0, width, height);

		for(var i = 0; i <= width - 1; i++){
			color = colorMaker(this.scale.invert(i));
			ctx.strokeStyle = color.toString();
			ctx.beginPath();
			ctx.moveTo(i + margin, 0);
			ctx.lineTo(i + margin, height);
			ctx.stroke();
		}

		const axisElem = ReactDOM.findDOMNode(this.refs.axis);
		const axis = d3.svg.axis()
			.scale(this.scale)
			.tickFormat(d3.format('.2e'));
		const axisd3 = d3.select(axisElem);
		axisd3.selectAll('g').remove();
		axisd3.append('g')
			.attr("transform", 'translate(' + margin + ',0)')
			.call(axis);
	}

	render(){
		return <div className="legend" style={{position: 'relative', height: this.props.height}}>
			<canvas ref="canvas" width={this.props.width + margin * 2} height={stripeHeight} style={{display: 'block'}}></canvas>
			<svg ref="axis" className="axis" width={this.props.width + margin * 2} height={this.props.height - stripeHeight} style={{display: 'block'}}></svg>
		</div>;
	}
}

	// var markerPositionAction = Reflux.createAction();
	// var Marker = getMarkerView(markerPositionAction);

function getMarkerView(markerPositionAction){

	return React.createClass({
		getInitialState: function(){
			return {};
		},

		componentDidMount: function(){
			this.unsubscribe = markerPositionAction.listen(this.positionUpdateHandler);
		},

		componentWillUnmount: function(){
			this.unsubscribe();
		},

		positionUpdateHandler: function(position){
			this.setState({position: position});
		},

		render: function(){
			var style = Utils.isUndefinedOrNull(this.state.position)
				? { display: 'none'}
				: {
				position: 'absolute',
				top: '0px',
				left: (this.state.position + margin - 2) + 'px',
				width: '3px',
				height: stripeHeight,
				backgroundColor: 'black'
			};

			return <div style={style}></div>;
		}
	});
}

export default Legend;

