module.exports = function(controlsStore){

	var serviceAction = controlsStore.serviceSelectedAction;

	var actions = Reflux.createActions([
		"dateSelected", "variableSelected", "gammaSelected"
	]);

	var view = React.createClass({

		mixins: [Reflux.connect(controlsStore)],

		componentDidUpdate: function(){
			if(!this.state.selectedService){
				var options = React.findDOMNode(this.refs.serviceSelector).options;
				if(options.length > 0){
					serviceAction(options[0].value);
				}
			}
		},

		serviceChangeHandler: function(){
			var service = this.getSelectedOption(this.refs.serviceSelector);
			if(service) serviceAction(service);
		},

		getSelectedOption: function(ref){
			var elem = React.findDOMNode(ref);
			var index = elem.selectedIndex;
			return index >= 0 ? elem.options[index].value : null;
		},

		render: function(){
			var self = this;
			return <div>

				<div className="services">
					<span>Services: </span>
					<select ref="serviceSelector" onChange={this.serviceChangeHandler}>{
						self.state.services.map(function(service){
							return service = self.state.selectedService
								? <option key={service} selected="selected">{service}</option>
								: <option key={service}>{service}</option>;
						})
					}</select>
				</div>

				<div className="variables">
					<span>Variables: </span>
					<select onChange={this.serviceChangeHandler}>{
						this.state.variables.map(function(varName){
							return <option key={varName}>{varName}</option>;
						})
					}</select>
				</div>

			</div>;
		}
	});

	return {
		View: view,
		actions: actions
	};
};
