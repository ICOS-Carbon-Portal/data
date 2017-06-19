import React, { Component } from 'react';
import {styles} from './styles';

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
				style={styles.clickIcon}
				title="Preview data"
				className="glyphicon glyphicon-eye-open"
				onClick={this.handlePreviewClick.bind(this)}
			/>
		);
	}
}