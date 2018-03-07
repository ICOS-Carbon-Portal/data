import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartIcon from '../CartIcon.jsx';
import PreviewIcon from '../PreviewIcon.jsx';
import {formatBytes} from '../../utils';


export default class SimpleObjectTableRow extends Component{
	constructor(props){
		super(props);
	}

	handlePreviewClick(id){
		if (this.props.previewAction) this.props.previewAction(id);
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const preview = props.preview;
		const previewItem = preview.item;
		const previewType = props.lookup.getSpecLookupType(objInfo.spec);
		const className = previewItem && previewItem.id === objInfo.dobj
			? "list-group-item-info"
			: "";
		const size = parseInt(objInfo.size);

		return(
			<tr className={className}>
				<td style={{whiteSpace: 'nowrap'}}>
					<CartIcon
						id={objInfo.dobj}
						{...copyprops(props, ['addToCart', 'removeFromCart', 'isAddedToCart', 'objInfo'])}
					/>
					<PreviewIcon
						id={objInfo.dobj}
						previewType={previewType}
						clickAction={this.handlePreviewClick.bind(this)}
					/>
				</td>
				<td>
					<div>
						<a href={objInfo.dobj} target="_blank">Landing page</a>
					</div>
					<div>
						<label>Description:</label> {objInfo.specLabel}
					</div>
					<div>
						<label>Filename:</label> {objInfo.fileName}
					</div>
				</td>
				<td>
					<div>
						<label>File size:</label> {formatBytes(size, 0)}
					</div>
					<div>
						<label>Data object submitted to Carbon Portal:</label> {formatDate(objInfo.submTime)}
					</div>
					<div>
						<label>Data object sample start:</label> {formatDate(objInfo.timeStart)}
					</div>
					<div>
						<label>Data object sample end:</label> {formatDate(objInfo.timeEnd)}
					</div>
				</td>
			</tr>
		);
	}
}

function stripExt(fileName){
	return fileName.slice(0, fileName.lastIndexOf('.'));
}

function formatDate(d){
	if(!d) return '';

	const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
	const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`

	return time === "00:00" ? `${date}` : `${date} ${time}`;
}

function pad2(s){
	return ("0" + s).substr(-2, 2);
}
