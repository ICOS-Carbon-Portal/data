import React, { Component } from 'react'
import { connect } from 'react-redux'

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		return <div>Hello, world!</div>;
	}
}

function stateToProps(state){
	return state;
}

export default connect(stateToProps)(App);

