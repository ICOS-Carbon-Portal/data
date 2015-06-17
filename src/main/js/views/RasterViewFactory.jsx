var MapUtils = require('./MapUtils.js');

module.exports = function(rasterStore){

	var highlightedValueAction = Reflux.createAction();

	var view = React.createClass({

		mixins: [Reflux.connect(rasterStore)],

		componentDidMount: function(){
			window.addEventListener('resize', this.resizeCanvas);
			var illustration = this.getCanvas().parentNode;
			illustration.addEventListener('mousemove', this.reportHighlightedValue);
		},

		componentWillUnmount: function(){
			window.removeEventListener('resize', this.resizeCanvas);
			var illustration = this.getCanvas().parentNode;
			illustration.removeEventListener('mousemove', this.reportHighlightedValue);
		},

		componentDidUpdate: function(){
			MapUtils.makeImage(this.getCanvas(), this.state.raster, this.state.gamma);
			this.resizeCanvas();
		},

		resizeCanvas: function(){
			var canvas = this.getCanvas();
			var canvasSize = MapUtils.getMapSizeStyle(canvas.offsetParent, canvas); //canvas has width and height
			canvas.style.width = canvasSize.width;
			canvas.style.height = canvasSize.height;
		},

		render: function(){
			return <canvas ref="canvas" className="raster"></canvas>;
		},

		getCanvas: function(){
			return React.findDOMNode(this.refs.canvas);
		},

		reportHighlightedValue: function(event) {
			var canvas = this.getCanvas();

			var x_cof = canvas.style.width.replace(/px/, '') / canvas.width;
			var y_cof = canvas.style.height.replace(/px/, '') / canvas.height;
	
			var x_position = Math.floor((event.clientX - canvas.parentNode.offsetLeft) / x_cof);
			var y_position = Math.floor((event.clientY - canvas.parentNode.offsetTop) / y_cof);
			
			if(x_position >= 0 && x_position < canvas.width
				&& y_position >= 0 && y_position < canvas.height) {

				var array = this.state.raster.array;
				var value = array[canvas.height - 1 - y_position][x_position];

				highlightedValueAction({value: value});
			}
		}

	});

	return {
		View: view,
		highlightedValueAction: highlightedValueAction
	};
};

