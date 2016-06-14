var MapUtils = require('./MapUtils.js');

module.exports = function(mapStore){

	return React.createClass({

		mixins: [Reflux.connect(mapStore)],

		componentDidMount: function(){
			window.addEventListener('resize', this.drawMap);
		},

		componentWillUnmount: function(){
			window.removeEventListener('resize', this.drawMap);
		},

		componentDidUpdate: function(){
			this.drawMap();
		},

		drawMap: function(){
			var rasterSize = this.state.rasterSize;
			var boundingBox = this.state.boundingBox;

			if(rasterSize && boundingBox){
				var map = React.findDOMNode(this.refs.map);
				var sizeStyle = MapUtils.getMapSizeStyle(map.offsetParent, boundingBox, rasterSize);
				map.style.width = sizeStyle.width;
				map.style.height = sizeStyle.height;
				MapUtils.draw(map, boundingBox, rasterSize);
			}
		},

		render: function(){
			return <div className="map" ref="map"></div>;
		}
	});

};

