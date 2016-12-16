import React, { Component } from 'react';
import { connect } from 'react-redux';
import {resetToast}from '../actions';
import {AnimatedToasters} from '../../../common/main/frontend/toaster/Toaster.jsx';

export default class ToasterContainer extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		return (this.props.toasterData.length > 0
			? <AnimatedToasters
				autoCloseDelay={5000}
				fadeInTime={100}
				fadeOutTime={400}
				toasterData={this.props.toasterData}
				closeToast={this.props.resetToaster}
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
		resetToaster(id){
			dispatch(resetToast(id));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(ToasterContainer);