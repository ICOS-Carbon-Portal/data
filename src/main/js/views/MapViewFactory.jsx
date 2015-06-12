var Map = require('../models/Map.js');

module.exports = function(mapStore){

	return React.createClass({

		mixins: [Reflux.connect(mapStore)],

		componentDidMount: function(){
			window.addEventListener('resize', this.resizeMap);
		},

		componentWillUnmount: function(){
			window.removeEventListener('resize', this.resizeMap);
		},

		componentDidUpdate: function(){
			var map = React.findDOMNode(this.refs.map);

			var raster = this.state.raster;
			this.dataMap = Map.draw(map, raster.boundingBox, raster.array.length);
			this.resizeMap();
		},

		resizeMap: function(){
			this.dataMap && this.dataMap.resize();
		},

		render: function(){
			return <div className="map" ref="map"></div>;
		}
	});

	
};

