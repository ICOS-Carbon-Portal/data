import React, { Component } from 'react';
import config from '../config';

export default class PreviewIcon extends Component {
	constructor(props){
		super(props);
	}

	handlePreviewClick(){
		if (this.props.clickAction) this.props.clickAction(this.props.id);
	}

	render(){
		return(
			<span
				style={config.iconStyle}
				title="Preview data"
				className="glyphicon glyphicon-eye-open"
				onClick={this.handlePreviewClick.bind(this)}
			/>
		);
	}
}