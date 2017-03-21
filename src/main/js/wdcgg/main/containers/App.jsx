import React, { Component } from 'react'
import { connect } from 'react-redux'
import Search from './Search.jsx';
import View from './View.jsx';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		switch(this.props.route){

			case 'search':
				return <Search />;

			case 'view':
				return <View />;

			default:
				return <Search />;
		}
	}
}

function stateToProps(state){
	return {route: state.route};
}

export default connect(stateToProps)(App);

