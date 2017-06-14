import React, { Component } from 'react';
import { connect } from 'react-redux';


class Collections extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		return (
			<div>Hello collections</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {

	};
}

export default connect(state => state, dispatchToProps)(Collections);
