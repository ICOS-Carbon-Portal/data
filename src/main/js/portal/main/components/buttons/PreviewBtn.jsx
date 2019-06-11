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
		if (!checkedObjects.length)
			return [false, ""];

		const datasets = checkedObjects.map(obj => obj.dataset);
		const previewTypes = checkedObjects.map(obj => lookup.getSpecLookupType(obj.spec));

		if (previewTypes.length !== datasets.length)
			throw new Error("Unexpected error in PreviewBtn:isPreviewEnabled");

		if (previewTypes.includes(undefined))
			return [false, "You have selected a data object that cannot be previewed"];

		else if (!datasets.every(dataset => dataset === datasets[0]))
			return [false, "Multiple previews are only available for data of same type"];

		else if (previewTypes.length > 1 && previewTypes.every(type => type === config.NETCDF))
			return [false, "You can only preview one NetCDF at a time"];

		else if (previewTypes.length > 1 && previewTypes.every(type => type === config.MAPGRAPH))
			return [false, "You can only preview one shipping line at a time"];

		else if (checkedObjects.reduce((accumulator, currentValue) => accumulator || typeof currentValue.nextVersion !== 'undefined', false))
			return [false, "You can only preview the newest version"];

		else
			return [true, ""];
	}
}
