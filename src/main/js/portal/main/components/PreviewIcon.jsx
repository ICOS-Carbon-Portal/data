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
		const {previewType, style} = this.props;

		return (
			<span style={style}>{previewType
				? <span
					style={styles.clickIcon}
					title="Preview data"
					className="glyphicon glyphicon-eye-open"
					onClick={this.handlePreviewClick.bind(this)}
				/>
				: <span
					style={styles.disabledClickIcon}
					title="No preview available for this data object"
					className="glyphicon glyphicon-eye-open text-muted"
				/>
			}</span>
		);
	}
}


