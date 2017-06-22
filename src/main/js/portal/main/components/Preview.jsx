import React, { Component } from 'react';
import PreviewTimeSerie from './PreviewTimeSerie.jsx';

export default class Preview extends Component {
	constructor(props){
		super(props);
	}

	render(){
		return (
			<PreviewTimeSerie {...this.props} />
		);
	}
}
