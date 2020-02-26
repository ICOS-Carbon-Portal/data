import React, { Component, MouseEvent } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartIcon from '../buttons/CartIcon.jsx';
import PreviewIcon from '../buttons/PreviewIcon.jsx';
import {formatBytes, formatDateWithOptionalTime} from '../../utils';
import {getMetadataHash} from "./SearchResultRegularRow";
import { ObjectsTable } from "../../models/State";
import config, { timezone } from '../../config';
import Preview from '../../models/Preview';
import Lookup from '../../models/Lookup.js';
import { UrlStr } from '../../backend/declarations';

type CompactSearchResultTableRowProps =  {
	objInfo: ObjectsTable,
	isAddedToCart: boolean,
	preview: Preview,
	lookup: Lookup | undefined,
	addToCart: (ids: UrlStr[]) => void,
	removeFromCart: (ids: UrlStr[]) => void
	handlePreview: (id: UrlStr[]) => void
	handleViewMetadata: (id: UrlStr) => void
};

export default class SearchResultCompactRow extends Component<CompactSearchResultTableRowProps> {
	handlePreviewClick(id: string){
		if (this.props.handlePreview) this.props.handlePreview([id]);
	}

	handleViewMetadata(ev: MouseEvent){
		if (this.props.handleViewMetadata && !ev.ctrlKey && !ev.metaKey) {
			ev.preventDefault();
			this.props.handleViewMetadata(this.props.objInfo.dobj);
		}
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const preview = props.preview;
		const previewItem = preview.item;
		const previewType = props.lookup?.getSpecLookupType(objInfo.spec);
		const className = previewItem && previewItem.id === objInfo.dobj
			? "list-group-item-info"
			: "";
		const size = parseInt(objInfo.size);
		const metadataHash = getMetadataHash(objInfo.dobj);

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
				<a title="View metadata" href={metadataHash} onClick={this.handleViewMetadata.bind(this)} style={{cursor: 'pointer'}}>{stripExt(objInfo.fileName)}</a>
			</td>
			<td>{formatBytes(size, 0)}</td>
			<td>{formatDateWithOptionalTime(new Date(objInfo.submTime), timezone[config.envri].offset)}</td>
			<td>{formatDateWithOptionalTime(new Date(objInfo.timeStart), timezone[config.envri].offset)}</td>
			<td>{formatDateWithOptionalTime(new Date(objInfo.timeEnd), timezone[config.envri].offset)}</td>
		</tr>;
	}
}

function stripExt(fileName: string){
	return fileName.slice(0, fileName.lastIndexOf('.'));
}
