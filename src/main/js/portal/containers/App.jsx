import React, { Component } from 'react'
import { connect } from 'react-redux'
import Wdcgg from './Wdcgg.jsx'
import Icos from './Icos.jsx'

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		return this.props.route === 'prototype'
			? <Icos />
			: <Wdcgg /> ;
	}
}

function stateToProps(state){
	return {route: state.route};
}

export default connect(stateToProps)(App);

