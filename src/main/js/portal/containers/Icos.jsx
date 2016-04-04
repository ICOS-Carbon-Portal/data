import React, { Component } from 'react'
import { connect } from 'react-redux'

class Icos extends Component {
	constructor(props){
		super(props);
	}

	render() {
		return <div>
			<a href="#wdcgg">To WDCGG demo service</a>
			{ this.props.route == 'subview'
				? <h1>ICOS Data Service Subview</h1>
				: <h1>ICOS Data Service Prototype</h1>}
		</div>;
	}
}

function stateToProps(state){
	return Object.assign({route: state.route}, state.icos);
}

export default connect(stateToProps)(Icos);

