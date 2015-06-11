var Utils = require('../Utils.js');

module.exports = function(Backend, serviceAction, variableAction, dateAction, errorHandler){

	return Reflux.createStore({

		getInitialState: function(){
			return null;
		},

		init: function(){
			this.state = {};
			this.listenTo(serviceAction, this.getUpdateHandler('service'));
			this.listenTo(variableAction, this.getUpdateHandler('variable'));
			this.listenTo(dateAction, this.getUpdateHandler('date'));
		},

		getUpdateHandler: function(prop){
			var self = this;
			return function(update){
				if(self.state[prop] !== update){
					self.state[prop] = update;
					self.fetchIfReady();
				}
			};
		},

		fetchIfReady: function(){
			var state = this.state;
			if(Utils.propertiesAreTruthy(state, ['service', 'variable', 'date'])){
				Backend.getRaster(state.service, state.variable, state.date, this.trigger.bind(this), errorHandler);
			}
		}

	});

};
