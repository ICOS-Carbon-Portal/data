import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartAddRemove from '../buttons/CartBtn.jsx';
import Preview from '../buttons/PreviewBtn.jsx';
import {formatBytes} from '../../utils';


const truncateStyle = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

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
		const extendedInfo = props.extendedInfo
			? props.extendedInfo.theme && props.extendedInfo.themeIcon
				? props.extendedInfo
				: {theme: 'Other data', themeIcon: 'https://static.icos-cp.eu/images/themes/oth.svg'}
			: props.extendedInfo;
		const preview = props.preview;
		const previewItem = preview.item;
		const previewType = props.lookup.getSpecLookupType(objInfo.spec);
		const className = previewItem && previewItem.id === objInfo.dobj
			? "list-group-item-info"
			: "";
		const size = parseInt(objInfo.size);

		return(
			<tr className={className}>
				<td style={{textAlign: 'center', width: 40}}>
					{extendedInfo && extendedInfo.themeIcon && extendedInfo.theme
						? <img style={{width: 20}} src={extendedInfo.themeIcon} title={extendedInfo.theme} />
						: null
					}
				</td>
				<td style={{maxWidth: 0}}>
					{extendedInfo && extendedInfo.title
						? <h4 style={{marginTop: 0}}>
							<a href={objInfo.dobj} title="Go to landing page" target="_blank">{extendedInfo.title}</a>
						</h4>
						: <h4 style={{marginTop: 0}}>
							<a href={objInfo.dobj} title="Go to landing page" target="_blank">{objInfo.specLabel}</a>
						</h4>
					}
					<div>
						<SourceAndFile extendedInfo={extendedInfo} fileName={objInfo.fileName} size={size} />
					</div>
					{extendedInfo && extendedInfo.description
						? <div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
						: null
					}
					<div>
						{`Data from ${formatDate(objInfo.timeStart)} to ${formatDate(objInfo.timeEnd)}`}
					</div>
				</td>
				<td style={{width: 200}}>
					<CartAddRemove
						id={objInfo.dobj}
						{...copyprops(props, ['addToCart', 'removeFromCart', 'isAddedToCart', 'objInfo'])}
					/>

					<Preview
						style={{marginTop: 10}}
						id={objInfo.dobj}
						previewType={previewType}
						clickAction={this.handlePreviewClick.bind(this)}
					/>
				</td>
			</tr>
		);
	}
}

const SourceAndFile = ({extendedInfo, fileName, size}) => {
	if (extendedInfo && extendedInfo.station){
		return size
			? <span><b>Source:</b> {extendedInfo.station.trim()} - <b>Filename:</b> {fileName} ({formatBytes(size, 0)})</span>
			: <span><b>Source:</b> {extendedInfo.station.trim()} - <b>Filename:</b> {fileName}</span>;
	} else {
		return size
			? <span><b>Filename:</b> {fileName} ({formatBytes(size, 0)})</span>
			: <span><b>Filename:</b> {fileName}</span>;
	}
};

function formatDate(d){
	if(!d) return '';

	return d.toISOString().substr(0, 10);
}
