import React, { Component } from 'react';
import CartIcon from '../buttons/CartIcon';
import PreviewIcon from '../buttons/PreviewIcon';
import { formatBytes, formatDateWithOptionalTime, pick, getUrlWithEnvironmentPrefix } from '../../utils';
import { ExtendedDobjInfo, KnownDataObject, WhoAmI } from "../../models/State";
import config, { timezone } from '../../config';
import Preview, { previewAvailability } from '../../models/Preview';
import PreviewLookup from '../../models/PreviewLookup';
import { UrlStr } from '../../backend/declarations';
import CollectionBtn from '../buttons/CollectionBtn';

type Props =  {
	objInfo: KnownDataObject,
	isAddedToCart: boolean,
	preview: Preview,
	extendedDobjInfo?: (ExtendedDobjInfo | undefined)[]
	lookup: PreviewLookup | undefined,
	addToCart: (ids: UrlStr[]) => void,
	removeFromCart: (ids: UrlStr[]) => void
	handlePreview: (id: UrlStr[]) => void
	user: WhoAmI
};

export default class SearchResultCompactRow extends Component<Props> {
	handlePreviewClick(){
		this.props.handlePreview([this.props.objInfo.dobj]);
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const previewItem = props.preview.item;
		const className = previewItem && previewItem.dobj === objInfo.dobj
			? "list-group-item-info"
			: "";
		const size = parseInt(objInfo.size);

		return <tr className={className}>
			<td className='text-nowrap'>
				{props.user.email &&
					<CartIcon
						style={{ marginRight: 10 }}
						objInfo={objInfo}
						{...pick(props, 'addToCart', 'removeFromCart', 'isAddedToCart')}
					/>
				}
				<PreviewIcon
					style={{ marginRight: 10 }}
					preview={previewAvailability(props.lookup, objInfo)}
					clickAction={this.handlePreviewClick.bind(this)}
				/>
				<CollectionLinks extendedDobjInfo={props.extendedDobjInfo} dobj={objInfo.dobj} />
				<a title="View metadata" href={getUrlWithEnvironmentPrefix(objInfo.dobj)}>{objInfo.fileName}</a>
			</td>
			<td className='text-nowrap'>{formatBytes(size, 0)}</td>
			<td>{formatDateWithOptionalTime(new Date(objInfo.submTime), timezone[config.envri].offset)}</td>
			<td>{formatDateWithOptionalTime(new Date(objInfo.timeStart), timezone[config.envri].offset)}</td>
			<td>{formatDateWithOptionalTime(new Date(objInfo.timeEnd), timezone[config.envri].offset)}</td>
		</tr>;
	}
}

const CollectionLinks: React.FunctionComponent<{ extendedDobjInfo?: (ExtendedDobjInfo | undefined)[], dobj: string }> = ({ extendedDobjInfo, dobj }) => {
	if (extendedDobjInfo === undefined || extendedDobjInfo[0] === undefined) return null;

	const dois = extendedDobjInfo.find(eDobjInfo => eDobjInfo!.dobj === dobj)?.dois;
	if (dois === undefined) return null;

	return (
		<>{
			dois.map((doi, i) =>
				<CollectionBtn key={i} url={config.doiBaseUrl + doi} title={`Part of collection ${doi}`} iconStyle={{ marginLeft:10, marginRight: 13 }} />
			)
		}</>
	);
};
