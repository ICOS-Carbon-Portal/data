var Utils = require('../Utils.js');

module.exports = function(Backend, actions, errorHandler){

	return Reflux.createStore({

		getInitialState: function(){
			return {};
		},

		init: function(){
			this.state = {};
			this.listenTo(actions.variableSelected, this.getUpdateHandler('variable'));
			this.listenTo(actions.dateSelected, this.getUpdateHandler('date'));
			this.listenTo(actions.elevationSelected, this.getUpdateHandler('elevation'));
			this.listenTo(actions.gammaSelected, this.gammaHandler);
		},

		getUpdateHandler: function(prop){
			var self = this;
			return function(update){
				var state = self.state;
				if(state.service != update.service){
					state.service = update.service;
					state.date = state.variable = state.elevation = state.raster = undefined;
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
			if(Utils.propertiesAreLengthy(state, ['service', 'variable', 'date', 'elevation'])){
				var doIfRelevant = Utils.doIfConditionHolds.bind(this, function(){
					return this.state.service === state.service &&
						this.state.variable === state.variable &&
						this.state.elevation &&
						this.state.date === state.date;
				});
				var successHandler = doIfRelevant(this.rasterHandler);
				Backend.getRaster(state.service, state.variable, state.date, state.elevation, successHandler, errorHandler);
			}
		},

		rasterHandler: function(raster){
			this.state.raster = raster;
			this.triggerIfComplete();
		},

		triggerIfComplete: function(){
			// console.log({state: this.state, actions});
			if(this.state.gamma && this.state.raster){
				this.trigger({
					raster: this.state.raster,
					gamma: this.state.gamma
				});
			}
		}

	});

};
