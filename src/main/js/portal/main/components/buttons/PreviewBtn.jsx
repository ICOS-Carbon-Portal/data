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
		const [enabled, title] = this.isPreviewEnabled(checkedObjects, this.props.lookup);
		const className = "btn btn-default " + (enabled ? "" : "disabled");
		const btnStyle = title.length ? {pointerEvents:'auto'} : {};

		return (
			<div style={style}>
				<button id="preview-button" onClick={this.handlePreviewClick.bind(this)} className={className} title={title} style={btnStyle} disabled={!enabled}>
					Preview
				</button>
			</div>
		);
	}

	isPreviewEnabled(checkedObjects, lookup) {
		if (!checkedObjects.length)
			return [false, ""];
		else if (!checkedObjects.reduce((acc,cur) => (lookup.getSpecLookupType(cur.spec)) ? true : false, true))
			return [false, "Preview is not available for data of this type."];
		else if (!checkedObjects.reduce((prev,cur) => (prev.spec === cur.spec) ? prev : false))
			return [false, "Preview is only available for data of same type."];
		else
			return [true, ""];
	}

}
