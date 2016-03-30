import React, { Component } from 'react'
import { connect } from 'react-redux'

class Icos extends Component {
	constructor(props){
		super(props);
	}

	render() {
		return <div>
			<a href="#wdcgg">To WDCGG demo service</a>
			<h1>ICOS Data Service Prototype</h1>
		</div>;
	}
}

export default connect(state => state)(Icos);

