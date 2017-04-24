import React, { Component } from 'react';
import { connect } from 'react-redux';
import Map from './Map.jsx';
import {ERROR} from '../actions';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;

		return <AppDiv {...props} />;
	}
}

const AppDiv = (props) => {
	return props.event === ERROR
		? <div id="error">{props.error}</div>
		: <Map {...props} />
}

const stateToProps = state => {
	return Object.assign({}, state);
};

export default connect(stateToProps)(App);
