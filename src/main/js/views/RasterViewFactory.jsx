var MapUtils = require('./MapUtils.js');

module.exports = function(rasterStore){

	var highlightedValueAction = Reflux.createAction();	

	var view = React.createClass({

		mixins: [Reflux.connect(rasterStore)],

		componentDidMount: function(){
			window.addEventListener('resize', this.resizeCanvas);	
			window.addEventListener('click', this.currentPosition);
		},

		componentWillUnmount: function(){
			window.removeEventListener('resize', this.resizeCanvas);
			window.removeEventListener('click', this.currentPosition);
		},

		componentDidUpdate: function(){
			var canvas = React.findDOMNode(this.refs.canvas);

			MapUtils.makeImage(canvas, this.state.raster, this.state.gamma);
			this.resizeCanvas();
		},

		resizeCanvas: function(){
			var canvas = React.findDOMNode(this.refs.canvas);
			var canvasSize = MapUtils.getMapSizeStyle(canvas.offsetParent, canvas); //canvas has width and height
			canvas.style.width = canvasSize.width;
			canvas.style.height = canvasSize.height;
		},

		render: function(){
			return <canvas ref="canvas" className="raster"></canvas>;
		},

		currentPosition: function(event) {
			var canvas = React.findDOMNode(this.refs.canvas);

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

