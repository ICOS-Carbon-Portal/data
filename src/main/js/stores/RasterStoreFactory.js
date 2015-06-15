var Utils = require('../Utils.js');

function getRasterSize(raster){
	if(!raster || !raster.array || !raster.array.length) return {width: 0, height: 0};
	return {
		width: raster.array[0].length,
		height: raster.array.length
	};
}

module.exports = function(Backend, variableAction, dateAction, gammaAction, errorHandler){

	return Reflux.createStore({

		getInitialState: function(){
			return {};
		},

		init: function(){
			this.state = {};
			this.listenTo(variableAction, this.getUpdateHandler('variable'));
			this.listenTo(dateAction, this.getUpdateHandler('date'));
			this.listenTo(gammaAction, this.gammaHandler);
		},

		getUpdateHandler: function(prop){
			var self = this;
			return function(update){
				var state = self.state;
				if(state.service != update.service){
					state.service = update.service;
					state.date = state.variable = state.raster = undefined;
					state[prop] = update.payload;
				} else if(state[prop] !== update.payload){
					state[prop] = update.payload;
					self.fetchIfReady();
				}
			};
		},

		gammaHandler: function(gamma){
			this.state.gamma = gamma;
			this.triggerIfComplete();
		},

		fetchIfReady: function(){
			var state = this.state;
			if(Utils.propertiesAreLengthy(state, ['service', 'variable', 'date'])){
				var doIfRelevant = Utils.doIfConditionHolds.bind(this, function(){
					return this.state.service === state.service &&
						this.state.variable === state.variable &&
						this.state.date === state.date;
				});
				var successHandler = doIfRelevant(this.rasterHandler);
				Backend.getRaster(state.service, state.variable, state.date, successHandler, errorHandler);
			}
		},

		rasterHandler: function(raster){
			this.state.raster = raster;
			this.triggerIfComplete();
		},

		triggerIfComplete: function(){
			if(this.state.gamma && this.state.raster){
				this.trigger({
					raster: this.state.raster,
					gamma: this.state.gamma,
					rasterSize: getRasterSize(this.state.raster)
				});
			}
		}

	});

};
