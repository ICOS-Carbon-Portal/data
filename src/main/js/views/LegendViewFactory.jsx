var MapUtils = require('./MapUtils.js');

module.exports = function(rasterStore){

	return React.createClass({

		mixins: [Reflux.connect(rasterStore)],

		componentDidUpdate: function(){
			var min = this.state.raster.stats.min;
			var max = this.state.raster.stats.max;
			var gamma = this.state.gamma;
			var width = this.props.width;

			var scale = d3.scale.linear();
			scale = (min < 0 && max > 0)
				? scale.domain([min, 0, max]).range([0, width / 2, width])
				: scale.domain([min, max]).range([0, width]);

			var canvas = React.findDOMNode(this.refs.canvas);
			

			var axisElem = React.findDOMNode(this.refs.axis);
			var axis = d3.svg.axis()
				.scale(scale)
				.tickFormat(d3.format('.2e'));
			var axisd3 = d3.select(axisElem);
			axisd3.selectAll('g').remove();
			axisd3.append('g')
				.attr("transform", "translate(20,0)")
				.call(axis);
		},

		render: function(){
			if(!this.state.raster) return <div className="legend"/>;

			return <div className="legend">
				<canvas ref="canvas" width={this.props.width} height="20"></canvas> <br/>
				<svg ref="axis" className="axis" width={this.props.width + 40} height={this.props.height - 20}></svg>
			</div>;
		}
	});

	
};

