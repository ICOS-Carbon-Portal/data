import React, { Component } from 'react';


export default class PreviewBtn extends Component{
	constructor(props){
		super(props);
	}

	handlePreviewClick(){
		if (this.props.clickAction) this.props.clickAction(this.props.checkedObjects);
	}

	render(){
		const {checkedObjects, style, enabled} = this.props;
		const className = "btn btn-default " + (enabled ? "" : "disabled");

		return (
			<div style={style}>
				<button id="preview-button" onClick={this.handlePreviewClick.bind(this)} className={className}>
					Preview
				</button>
			</div>
		);
	}
}
