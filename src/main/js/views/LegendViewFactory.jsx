var MapUtils = require('./MapUtils.js');
var Utils = require('../Utils.js');

var margin = 20;
var stripeHeight = 20;

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

module.exports = function(rasterStore, highlightedValueAction){

	var markerPositionAction = Reflux.createAction();
	var Marker = getMarkerView(markerPositionAction);

	return React.createClass({

		mixins: [Reflux.connect(rasterStore)],

		componentDidMount: function(){
			this.unsubscribe = highlightedValueAction.listen(this.highlightedValueHandler);
		},

		componentWillUnmount: function(){
			this.unsubscribe();
		},

		highlightedValueHandler: function(value){
			var markerPosition = !this.scale || Utils.isUndefinedOrNull(value.value)
				? null
				: this.scale(value.value);
			markerPositionAction(markerPosition);
		},

		componentDidUpdate: function(){
			var min = this.state.raster.stats.min;
			var max = this.state.raster.stats.max;
			var gamma = this.state.gamma;
			var colorMaker = MapUtils.getColorMaker(min, max, gamma);
			var width = this.props.width;
			var height = this.props.height;
			var color;

			this.scale = d3.scale.linear();
			this.scale = (min < 0 && max > 0)
				? this.scale.domain([min, 0, max]).range([0, (width - 1) / 2 , width - 1])
				: this.scale.domain([min, max]).range([0, width - 1]);

			var canvas = React.findDOMNode(this.refs.canvas);
			var ctx = canvas.getContext('2d');

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

			var axisElem = React.findDOMNode(this.refs.axis);
			var axis = d3.svg.axis()
				.scale(this.scale)
				.tickFormat(d3.format('.2e'));
			var axisd3 = d3.select(axisElem);
			axisd3.selectAll('g').remove();
			axisd3.append('g')
				.attr("transform", 'translate(' + margin + ',0)')
				.call(axis);
		},

		render: function(){
			return <div className="legend" style={{position: 'relative'}}>
				<canvas ref="canvas" width={this.props.width + margin * 2} height={stripeHeight} style={{display: 'block'}}></canvas>
				<svg ref="axis" className="axis" width={this.props.width + margin * 2} height={this.props.height - stripeHeight} style={{display: 'block'}}></svg>
				<Marker/>
			</div>;
		}
	});

	
};

