import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartIcon from './CartIcon.jsx';
import PreviewIcon from './PreviewIcon.jsx';


export default class ObjectTableRow extends Component {
	constructor(props){
		super(props);
	}

	handlePreviewClick(id){
		console.log({id, preview: this.props.objInfo});
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;

		return <tr>
			<td>
				<CartIcon id={objInfo.dobj} {...copyprops(props, ['addToCart', 'removeFromCart', 'isAddedToCart', 'objInfo'])} />
				<PreviewIcon id={objInfo.dobj} clickAction={this.handlePreviewClick.bind(this)} />
				<a href={objInfo.dobj} target="_blank">{stripExt(objInfo.fileName)}</a>
			</td>
			<td>{formatDate(objInfo.submTime)}</td>
			<td>{formatDate(objInfo.acqStart)}</td>
			<td>{formatDate(objInfo.acqEnd)}</td>
		</tr>;
	}
}

function stripExt(fileName){
	return fileName.slice(0, fileName.lastIndexOf('.'));
}

function formatDate(d){
	if(!d) return '';
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function pad2(s){
	return ("0" + s).substr(-2, 2);
}

