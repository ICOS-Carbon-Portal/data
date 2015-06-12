var Map = require('../models/Map.js');

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
			Map.makeImage(canvas, this.state.raster, this.state.gamma);
			this.resizeCanvas();
		},

		resizeCanvas: function(){
			var canvas = React.findDOMNode(this.refs.canvas);
			var offsetTop = canvas.offsetParent.offsetTop;
			var scale = Math.min(
				canvas.parentElement.clientWidth / canvas.width,
				(window.innerHeight - offsetTop) / canvas.height
			);

			var width = canvas.width * scale;
			var height = canvas.height * scale;

			canvas.style.width = width + 'px';
			canvas.style.height = height + 'px';
		},

		render: function(){
			return <canvas ref="canvas"></canvas>;
		}
	});

};

