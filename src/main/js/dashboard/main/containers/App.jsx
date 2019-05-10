import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import {} from '../actions';


export class App extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		console.log({props});

		return (
			<div style={{marginTop: 10}}>

				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<ErrorBoundary failWithError={props.failWithError}>
					<div>Hello</div>
				</ErrorBoundary>
			</div>
		);
	}
}

function stateToProps(state){
	return state
}

function dispatchToProps(dispatch){
	return {

	};
}

export default connect(stateToProps, dispatchToProps)(App);
