var Utils = require('../Utils.js');

module.exports = function(Backend, variableAction, dateAction, errorHandler){

	return Reflux.createStore({

		getInitialState: function(){
			return null;
		},

		init: function(){
			this.state = {};
			this.listenTo(variableAction, this.getUpdateHandler('variable'));
			this.listenTo(dateAction, this.getUpdateHandler('date'));
		},

		getUpdateHandler: function(prop){
			var self = this;
			return function(update){

				if(self.state.service != update.service){
					self.state = {service: update.service};
					self.state[prop] = update.payload;
				} else if(self.state[prop] !== update.payload){
					self.state[prop] = update.payload;
					self.fetchIfReady();
				}
			};
		},

		fetchIfReady: function(){
			var state = this.state;
			if(Utils.propertiesAreLengthy(state, ['service', 'variable', 'date'])){
				Backend.getRaster(state.service, state.variable, state.date, this.trigger.bind(this), errorHandler);
			}
		}

	});

};
