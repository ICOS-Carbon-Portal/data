import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartAddRemove from '../buttons/CartAddRemove.jsx';
import Preview from '../buttons/Preview.jsx';
// import CartIcon from '../CartIcon.jsx';
// import PreviewIcon from '../PreviewIcon.jsx';
import {formatBytes} from '../../utils';
// import {styles} from '../styles';


const themes = {
	a: 'Atmospheric Thematic Center',
	e: 'Ecosystem Thematic Center',
	o: 'Ocean Thematic Center'
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
		const themeStyle = getThemeStyle(props.theme);
		const truncateStyle = {
			maxWidth: '100%',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			textOverflow: 'ellipsis'
		};
		const levelStyle = {
			display: 'inline-block',
			fontSize: 16,
			marginTop: 5,
			textAlign: 'center',
			width: 30,
			height: 30,
			backgroundColor: 'white',
			border: '2px solid black',
			borderRadius: '50%',
			padding: 3
		};

		return(
			<tr className={className}>
				<td style={{textAlign: 'center', width: 40}}>
					<span style={themeStyle} className={themeCls} title={themes[props.theme]} />
					<div style={levelStyle} title="Data lavel">{props.level}</div>
				</td>
				<td style={{maxWidth: 0}}>
					{extendedInfo && extendedInfo.title
						? <b>{extendedInfo.title}</b>
						: <b>{objInfo.specLabel}</b>
					}
					<div>
						<a href={objInfo.dobj} target="_blank">Landing page</a>
					</div>
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
				<td style={{width: 224}}>
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
			return 'glyphicon glyphicon-record';
	}
};

const getThemeStyle = theme => {
	const themeStyle = {
		backgroundColor: 'black',
		color: 'white',
		borderRadius: 50
	};

	switch(theme){
		case 'a':
			themeStyle.fontSize = '26px';
			// themeStyle.color = 'white';
			themeStyle.padding = 6;
			return themeStyle;

		case 'e':
			themeStyle.fontSize = '20px';
			// themeStyle.color = 'rgb(50,200,50)';
			themeStyle.padding = 9;
			return themeStyle;

		case 'o':
			themeStyle.fontSize = '26px';
			// themeStyle.color = 'rgba(50,100,240,0.9)';
			themeStyle.padding = 6;
			return themeStyle;

		default:
			return {
				fontSize: '38px',
				padding: 0,
				margin: '3px 0 0 0'
			};
	}
};

function formatDate(d){
	if(!d) return '';

	return d.toISOString().substr(0, 10);
}
