import React, { Component } from 'react';
import { connect } from 'react-redux';
import Map from './Map.jsx';
import {ERROR} from '../actions';
import {AnimatedToasters} from 'icos-cp-toaster';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;

		return <AppDiv {...props} />;
	}
}

const AppDiv = props => {
	return props.event === ERROR
		? <AnimatedToasters
			autoCloseDelay={null}
			fadeInTime={100}
			fadeOutTime={400}
			toasterData={props.toasterData}
			maxWidth={400}
		/>
		: <Map {...props} />
}

const stateToProps = state => {
	return Object.assign({}, state);
};

export default connect(stateToProps)(App);
