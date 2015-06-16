var MapUtils = require('./MapUtils.js');

var margin = 20;
var stripeHeight = 20;

module.exports = function(rasterStore){

	return React.createClass({

		mixins: [Reflux.connect(rasterStore)],

		componentDidUpdate: function(){
			var min = this.state.raster.stats.min;
			var max = this.state.raster.stats.max;
			var gamma = this.state.gamma;
			var colorMaker = MapUtils.getColorMaker(min, max, gamma);
			var width = this.props.width;
			var height = this.props.height;
			var color;

			var scale = d3.scale.linear();
			scale = (min < 0 && max > 0)
				? scale.domain([min, 0, max]).range([0, (width - 1) / 2 , width - 1])
				: scale.domain([min, max]).range([0, width - 1]);

			var canvas = React.findDOMNode(this.refs.canvas);
			var ctx = canvas.getContext('2d');

			ctx.fillStyle = 'white';
			ctx.strokeStyle = 'black';
			ctx.fillRect(margin, 0, width, height);
			ctx.strokeRect(margin, 0, width, height);

			for(var i = 0; i <= width - 1; i++){
				color = colorMaker(scale.invert(i));
				ctx.strokeStyle = color.toString();//['rgb(', color.r, ',', color.g, ',', color.b, ')'].join('');
				ctx.beginPath();
				ctx.moveTo(i + margin, 0);
				ctx.lineTo(i + margin, height);
				ctx.stroke();
			}

			var axisElem = React.findDOMNode(this.refs.axis);
			var axis = d3.svg.axis()
				.scale(scale)
				.tickFormat(d3.format('.2e'));
			var axisd3 = d3.select(axisElem);
			axisd3.selectAll('g').remove();
			axisd3.append('g')
				.attr("transform", 'translate(' + margin + ',0)')
				.call(axis);
		},

		render: function(){
			return <div className="legend">
				<canvas ref="canvas" width={this.props.width + margin * 2} height={stripeHeight}></canvas>
				<svg ref="axis" className="axis" width={this.props.width + margin * 2} height={this.props.height - stripeHeight}></svg>
			</div>;
		}
	});

	
};

