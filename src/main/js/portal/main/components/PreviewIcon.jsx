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
		const {previewType} = this.props;

		return (
			<span>{previewType
				? <span
					style={styles.clickIcon}
					title="Preview data"
					className="glyphicon glyphicon-eye-open"
					onClick={this.handlePreviewClick.bind(this)}
				/>
				: <span
					style={Object.assign({visibility: 'hidden'}, styles.clickIcon)}
					className="glyphicon glyphicon-eye-open"
				/>
			}</span>
		);
	}
}


