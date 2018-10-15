import React, { Component } from 'react';
import config from "../../config";


export default class PreviewBtn extends Component{
	constructor(props){
		super(props);
	}

	handlePreviewClick(){
		if (this.props.clickAction) this.props.clickAction(this.props.checkedObjects.flatMap(co => co.dobj));
	}

	render(){
		const {checkedObjects, style, lookup} = this.props;
		const [enabled, title] = this.isPreviewEnabled(checkedObjects, lookup);
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
		const previewTypes = checkedObjects.map(obj => lookup.getSpecLookupType(obj.spec));

		if (!checkedObjects.length)
			return [false, ""];

		else if (previewTypes.includes(undefined))
			return [false, "Preview is only available for time series, NetCDF and shipping lines."];

		else if (previewTypes.length > 1 && previewTypes.every(type => type === config.NETCDF))
			return [false, "You can only preview one NetCDF at a time"];

		else if (previewTypes.length > 1 && previewTypes.every(type => type === config.MAPGRAPH))
			return [false, "You can only preview one shipping line at a time"];

		else if (previewTypes.every(type => type === config.TIMESERIES))
			return [true, ""];

		else if (checkedObjects.length > 1 && checkedObjects.reduce((prev,cur) => (prev.spec === cur.spec) ? prev : false))
			return [false, "Preview is not available for data of this type."];

		else if (!checkedObjects.reduce((prev,cur) => (prev.spec === cur.spec) ? prev : false))
			return [false, "Preview is only available for data of same type."];

		else
			return [true, ""];
	}
}
