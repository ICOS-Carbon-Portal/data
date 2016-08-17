var Utils = require('../Utils.js');

module.exports = function(Backend, RasterStore, errorHandler){

	var topoJsonReceived = false;

	return Reflux.createStore({

		getInitialState: function(){
			return {};
		},

		init: function(){
			this.state = {};
			Backend.getCountriesTopoJson(this.gotTopoJson, errorHandler);
			this.listenTo(RasterStore, this.handleRaster);
		},

		gotTopoJson: function(topo){
			this.state.countriesTopo = topo;
			topoJsonReceived = true;
			this.triggerIfReady();
		},

		handleRaster: function(rasterState){
			var newSize = {
				width: rasterState.raster.width,
				height: rasterState.raster.height
			};
			var oldSize = this.state.rasterSize;

			var newBbox = rasterState.raster.boundingBox;
			var oldBbox = this.state.boundingBox;

			if(!oldSize || !oldBbox ||
				newSize.width !== oldSize.width || newSize.height !== oldSize.height ||
				newBbox.latMin !== oldBbox.latMin || newBbox.latMax !== oldBbox.latMax ||
				newBbox.lonMin !== oldBbox.lonMin || newBbox.lonMax !== oldBbox.lonMax){

				this.state.rasterSize = newSize;
				this.state.boundingBox = newBbox;
				this.triggerIfReady();
			}
		},

		triggerIfReady: function(){
			if(topoJsonReceived && this.state.rasterSize && this.state.boundingBox) this.trigger(this.state);
		}
	});

};
