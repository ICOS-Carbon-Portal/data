import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartIcon from '../buttons/CartIcon.jsx';
import PreviewIcon from '../buttons/PreviewIcon.jsx';
import {formatBytes, formatDateWithOptionalTime} from '../../utils';


export default class CompactSearchResultTableRow extends Component {
	constructor(props){
		super(props);
	}

	handlePreviewClick(id){
		if (this.props.previewAction) this.props.previewAction([id]);
	}

	handleViewMetadata(){
		if (this.props.viewMetadata) this.props.viewMetadata(this.props.objInfo.dobj);
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

		return <tr className={className}>
			<td style={{whiteSpace: 'nowrap'}}>
				<CartIcon
					style={{marginRight: 10}}
					id={objInfo.dobj}
					{...copyprops(props, ['addToCart', 'removeFromCart', 'isAddedToCart', 'objInfo'])}
				/>
				<PreviewIcon
					style={{marginRight: 10}}
					id={objInfo.dobj}
					previewType={previewType}
					clickAction={this.handlePreviewClick.bind(this)}
				/>
				<a title="View metadata" onClick={this.handleViewMetadata.bind(this)} style={{cursor: 'pointer'}}>{stripExt(objInfo.fileName)}</a>
			</td>
			<td>{formatBytes(size, 0)}</td>
			<td>{formatDateWithOptionalTime(objInfo.submTime)}</td>
			<td>{formatDateWithOptionalTime(objInfo.timeStart)}</td>
			<td>{formatDateWithOptionalTime(objInfo.timeEnd)}</td>
		</tr>;
	}
}

function stripExt(fileName){
	return fileName.slice(0, fileName.lastIndexOf('.'));
}
