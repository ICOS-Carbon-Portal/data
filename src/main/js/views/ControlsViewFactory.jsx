var Utils = require('../Utils.js');

var Selector = React.createClass({

	componentDidUpdate: function(){
		this.changeHandler();
	},

	changeHandler: function(){
		var value = React.findDOMNode(this.refs.selector).value;
		if(Utils.isLengthy(value)) this.props.action(value);
	},

	render: function(){
		var selectedOption = this.props.selectedOption;
		var selected = Utils.isUndefined(selectedOption) ? this.props.options[0] : selectedOption;

		return <div className={this.props.className}>

			<span>{this.props.caption + ": "}</span>

			<select ref="selector" defaultValue={selected} onChange={this.changeHandler}>{

				this.props.options.map(function(optionValue, i){
					return <option key={optionValue}>{optionValue}</option>;
				})

			}</select>

		</div>;
	}
});

module.exports = function(controlsStore){

	var serviceAction = controlsStore.serviceSelectedAction;

	var actions = Reflux.createActions([
		"dateSelected", "variableSelected", "gammaSelected"
	]);

	var view = React.createClass({

		mixins: [Reflux.connect(controlsStore)],

		wrapAction: function(action){
			var service = this.state.selectedService;
			return function(payload){
				action({
					payload: payload,
					service: service
				});
			};
		},

		render: function(){

			var defaultGammaIndex = Math.floor(this.state.gammas.length / 2);
			var defaultGamma = this.state.gammas[defaultGammaIndex];

			var variableSelected = this.wrapAction(actions.variableSelected);
			var dateSelected = this.wrapAction(actions.dateSelected);

			return <div className="controls">

				<Selector className="services" caption="Service" options={this.state.services}
					selectedOption={this.state.selectedService} action={serviceAction} />

				<Selector className="variables" caption="Variable" options={this.state.variables}
					action={variableSelected} />

				<Selector className="dates" caption="Date" options={this.state.dates}
					action={dateSelected} />

				<Selector className="gammas" caption="Gamma" options={this.state.gammas}
					selectedOption={defaultGamma} action={actions.gammaSelected} />

			</div>;
		}
	});

	return {
		View: view,
		actions: actions
	};
};

