var MapUtils = require('./MapUtils.js');

module.exports = function(rasterStore){

	return React.createClass({

		mixins: [Reflux.connect(rasterStore)],

		componentDidMount: function(){
			window.addEventListener('resize', this.resizeCanvas);
		},

		componentWillUnmount: function(){
			window.removeEventListener('resize', this.resizeCanvas);
		},

		componentDidUpdate: function(){
			var canvas = React.findDOMNode(this.refs.canvas);

			var raster = this.state;
			MapUtils.makeImage(canvas, this.state.raster, this.state.gamma);
			this.resizeCanvas();
		},

		resizeCanvas: function(){
			var canvas = React.findDOMNode(this.refs.canvas);
			var canvasSize = MapUtils.getMapSizeStyle(canvas.offsetParent, canvas.width, canvas.height);
			canvas.style.width = canvasSize.width;
			canvas.style.height = canvasSize.height;
		},

		render: function(){
			return <canvas ref="canvas"></canvas>;
		}
	});

};

