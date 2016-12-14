import React, { Component } from 'react';
import { connect } from 'react-redux';
import {resetToast}from '../actions';
import {AnimatedToaster} from '../../../common/main/frontend/toaster/Toaster.jsx';

export default class ToasterContainer extends Component {
	constructor(props) {
		super(props);
	}

	handleToasterReset(){
		this.props.resetToaster();
	}

	render(){
		return (this.props.toasterData
			? <AnimatedToaster
				autoCloseDelay={5000}
				fadeInTime={100}
				fadeOutTime={400}
				toasterData={this.props.toasterData}
				closeToast={this.handleToasterReset.bind(this)}
			/>
			: null
		);
	}
}

function stateToProps(state){
	return Object.assign({}, {
		toasterData: state.toasterData
	});
}

function dispatchToProps(dispatch){
	return {
		resetToaster(){
			dispatch(resetToast);
		}
	};
}

export default connect(stateToProps, dispatchToProps)(ToasterContainer);