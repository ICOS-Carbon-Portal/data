import React, { Component } from 'react';
import { connect } from 'react-redux';
import {ERROR} from '../actions';
import {AnimatedToasters} from 'icos-cp-toaster';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;

		return <div>Hello</div>;
	}
}

const stateToProps = state => {
	return Object.assign({}, state);
};

export default connect(stateToProps)(App);
