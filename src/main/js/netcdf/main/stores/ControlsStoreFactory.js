import {getServices, getDates, getVariables, getElevations} from '../backend';

export default function(errorHandler, actions){

	var store = Reflux.createStore({

		getInitialState: function(){
			return {
				services: [],
				dates: [],
				variables: [],
				elevations: [],
				gammas: [0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0]
			};
		},

		init: function(){
			this.state = this.getInitialState();
			this.lastVariable = null;

			this.listenTo(actions.serviceSelected, this.serviceSelectionListener);
			this.listenTo(actions.variableSelected, this.varSelectionListener);
			var successHandler = this.serviceListHandler.bind(this);
			getServices().then(successHandler, errorHandler);
		},

		serviceSelectionListener: function(selectedService){
			if(this.state.selectedService !== selectedService){
				this.state.selectedService = selectedService;
				this.state.selectedVariable = null;
				this.state.dates = [];
				this.state.variables = [];
				this.state.elevations = [];

				var datesSuccess = this.datesListHandler.bind(this);
				getDates(selectedService).then(datesSuccess, errorHandler);

				var varsSuccess = this.variablesListHandler.bind(this);
				getVariables(selectedService).then(varsSuccess, errorHandler);
			}
		},

		varSelectionListener: function(selectedVariable){
			var service = this.state.selectedService;
			var variable = selectedVariable.payload;

			if (this.lastVariable != variable) {
				this.lastVariable = variable;
				var elevationsSuccess = this.elevationListHandler.bind(this);
				getElevations(service, variable).then(elevationsSuccess, errorHandler);
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

			if(this.state.selectedVariable == null){
				this.state.selectedVariable = variables[0];
			}

			this.publishIfReady();
		},

		elevationListHandler: function(elevations){
			this.state.elevations = elevations;
			this.publishIfReady();
		},

		publishIfReady: function(){
			if(this.state.dates.length > 0 && this.state.variables.length > 0){
				this.trigger(this.state);
			}
		}

	});

	return store;
};
