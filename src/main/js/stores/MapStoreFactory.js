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
			//add topojson for 'countries' scope to the (globally loaded) Datamaps library
			Datamaps.prototype.countriesTopo = topo;
			topoJsonReceived = true;
			this.triggerIfReady();
		},

		handleRaster: function(rasterState){
			var newSize = rasterState.rasterSize;
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
