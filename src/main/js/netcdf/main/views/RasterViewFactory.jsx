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
			const bbox = this.state.raster
				? this.state.raster.boundingBox
				: {latMin: -89.5, latMax: 89.5, lonMin: -179.5, lonMax: 179.5};
			const rasterSize = this.state.raster || {width: 360, height: 180};
			var canvasSize = MapUtils.getMapSizeStyle(canvas.offsetParent, bbox, rasterSize);
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

				var value = this.state.raster.getValue(y_position, x_position);
				highlightedValueAction({value: value});
			}
		}

	});

	return {
		View: view,
		highlightedValueAction: highlightedValueAction
	};
};

