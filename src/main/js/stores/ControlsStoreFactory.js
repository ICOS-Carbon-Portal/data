module.exports = function(Backend, errorHandler){

	var serviceSelectedAction = Reflux.createAction();

	var store = Reflux.createStore({

		getInitialState: function(){
			this.state = {
				services: [],
				dates: [],
				variables: [],
				gammas: [0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 5.0]
			};
			return this.state;
		},

		init: function(){
			this.listenTo(serviceSelectedAction, this.serviceSelectionListener);
			var successHandler = this.serviceListHandler.bind(this);
			Backend.getServices(successHandler, errorHandler);
		},

		serviceSelectionListener: function(selectedService){
			if(this.state.selectedService !== selectedService){
				this.state.selectedService = selectedService;

				var datesSuccess = this.datesListHandler.bind(this);
				Backend.getDates(selectedService, datesSuccess, errorHandler);

				var varsSuccess = this.variablesListHandler.bind(this);
				Backend.getVariables(selectedService, varsSuccess, errorHandler);
			}
		},

		serviceListHandler: function(services){
			this.state.services = services;
			this.trigger(this.state);
		},

		datesListHandler: function(dates){
			this.state.dates = dates;
			this.publishIfReady();
		},

		variablesListHandler: function(variables){
			this.state.variables = variables;
			this.publishIfReady();
		},

		publishIfReady: function(){
			if(this.state.dates.length > 0 && this.state.variables.length > 0){
				this.trigger(this.state);
			}
		}

	});

	store.serviceSelectedAction = serviceSelectedAction;

	return store;
};
