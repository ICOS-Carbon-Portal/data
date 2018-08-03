import React, { Component } from 'react';


export default class PreviewBtn extends Component{
	constructor(props){
		super(props);
	}

	handlePreviewClick(){
		if (this.props.clickAction) this.props.clickAction(this.props.checkedObjects.flatMap(co => co.dobj));
	}

	render(){
		const {checkedObjects, style} = this.props;
		const enabled = this.isPreviewEnabled(checkedObjects, this.props.lookup);
		const className = "btn btn-default " + (enabled ? "" : "disabled");

		return (
			<div style={style}>
				<button id="preview-button" onClick={this.handlePreviewClick.bind(this)} className={className}>
					Preview
				</button>
			</div>
		);
	}

	isPreviewEnabled(checkedObjects, lookup) {
		return checkedObjects.length
			&& checkedObjects.reduce((acc,cur) => (lookup.getSpecLookupType(cur.spec)) ? true : false, true)
			&& checkedObjects.reduce((prev,cur) => (prev.spec === cur.spec) ? prev : false);
	}

}
