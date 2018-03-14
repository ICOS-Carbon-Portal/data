import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartAddRemove from '../buttons/CartBtn.jsx';
import Preview from '../buttons/PreviewBtn.jsx';
import {formatBytes} from '../../utils';


const themes = {
	a: 'Atmospheric Thematic Center',
	e: 'Ecosystem Thematic Center',
	o: 'Ocean Thematic Center'
};

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
		const extendedInfo = props.extendedInfo;
		const preview = props.preview;
		const previewItem = preview.item;
		const previewType = props.lookup.getSpecLookupType(objInfo.spec);
		const className = previewItem && previewItem.id === objInfo.dobj
			? "list-group-item-info"
			: "";
		const size = parseInt(objInfo.size);

		const themeCls = getThemeCls(props.theme);
		const themeStyle = {fontSize: 22};

		return(
			<tr className={className}>
				<td style={{textAlign: 'center', width: 40}}>
					<span style={themeStyle} className={themeCls} title={themes[props.theme]} />
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
						{objInfo.fileName} ({formatBytes(size, 0)})
					</div>
					{extendedInfo && extendedInfo.description
						? <div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
						: null
					}
					<div>
						{`Data from ${formatDate(objInfo.timeStart)} to ${formatDate(objInfo.timeEnd)}.`}
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

const getThemeCls = theme => {
	switch(theme){
		case 'a':
			return 'glyphicon glyphicon-cloud';

		case 'e':
			return 'glyphicon glyphicon-leaf';

		case 'o':
			return 'glyphicon glyphicon-tint';

		default:
			return 'glyphicon glyphicon-asterisk';
	}
};

function formatDate(d){
	if(!d) return '';

	return d.toISOString().substr(0, 10);
}
