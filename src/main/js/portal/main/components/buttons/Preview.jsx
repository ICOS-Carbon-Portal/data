import React, { Component } from 'react';


export default class Preview extends Component{
	constructor(props){
		super(props);
	}

	handlePreviewClick(){
		if (this.props.clickAction) this.props.clickAction(this.props.id);
	}

	render(){
		const {previewType, style} = this.props;

		return (
			<div style={style}>{previewType
				? <button onClick={this.handlePreviewClick.bind(this)} className="btn btn-default btn-sm">
					<span className="glyphicon glyphicon-eye-open" /> Preview data
				</button>
				: <button className="btn btn-default btn-sm disabled">
					<span className="glyphicon glyphicon-eye-close" /> Preview unavailable
				</button>
			}</div>
		);
	}
}