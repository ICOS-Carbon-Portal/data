import React, { Component } from 'react';
import {copyprops} from 'icos-cp-utils';
import CartIcon from '../CartIcon.jsx';
import PreviewIcon from '../PreviewIcon.jsx';
import {formatBytes} from '../../utils';
import {styles} from '../styles';


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
		// const size = parseInt(objInfo.size);

		const themeCls = props.theme === 'a'
			? 'glyphicon glyphicon-cloud'
			: props.theme === 'e'
				? 'glyphicon glyphicon-leaf'
				: 'glyphicon glyphicon-tint';
		const themeStyle = getThemeStyle(props.theme);
		const truncateStyle = {
			maxWidth: '100%',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			textOverflow: 'ellipsis'
		};

		return(
			<tr className={className}>
				<td style={{whiteSpace: 'nowrap', width: 78}}>
					<div style={{textAlign: 'center'}}>
						<span style={themeStyle} className={themeCls} title={themes[props.theme]} />
					</div>
					<div style={{marginTop: 10, width: '100%', display: 'block'}}>
						<span style={{width: '50%', display: 'inline-block', textAlign: 'left'}}>
							<CartIcon
								id={objInfo.dobj}
								{...copyprops(props, ['addToCart', 'removeFromCart', 'isAddedToCart', 'objInfo'])}
							/>
						</span>
						<span style={{width: '50%', display: 'inline-block', textAlign: 'right'}}>
							<PreviewIcon
								id={objInfo.dobj}
								previewType={previewType}
								clickAction={this.handlePreviewClick.bind(this)}
							/>
						</span>
					</div>
				</td>
				<td style={{maxWidth: 0}}>
					{extendedInfo && extendedInfo.title
						? <b>{extendedInfo.title}</b>
						: <b>{objInfo.specLabel}</b>
					}
					<div>
						<a href={objInfo.dobj} target="_blank">Landing page</a>
					</div>
					{extendedInfo && extendedInfo.description
						? <div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
						: <div>{objInfo.fileName}</div>
					}
					<div>
						{`Data from ${formatDate(objInfo.timeStart)} to ${formatDate(objInfo.timeEnd)}.`}
					</div>


					{/*<div>*/}
						{/*<label>Data level:</label> {objInfo.level}*/}
					{/*</div>*/}
					{/*<div>*/}
						{/*<label>Data type:</label> {objInfo.specLabel}*/}
					{/*</div>*/}
					{/*<div>*/}
						{/*<label>Filename:</label> {objInfo.fileName}*/}
					{/*</div>*/}
					{/*{extendedInfo && extendedInfo.title*/}
						{/*? <div>*/}
							{/*<label>Title:</label> {extendedInfo.title}*/}
						{/*</div>*/}
						{/*: null*/}
					{/*}*/}
					{/*{extendedInfo && extendedInfo.description*/}
						{/*? <div>*/}
							{/*<label>Description:</label> {extendedInfo.description}*/}
						{/*</div>*/}
						{/*: null*/}
					{/*}*/}
					{/*<div>*/}
						{/*<label>File size:</label> {formatBytes(size, 0)}*/}
					{/*</div>*/}
					{/*<div>*/}
						{/*{`Data was sampled between ${formatDate(objInfo.timeStart)} and ${formatDate(objInfo.timeEnd)} and submitted to Carbon Portal ${formatDate(objInfo.submTime)}`}*/}
					{/*</div>*/}
				</td>
			</tr>
		);
	}
}

const getThemeStyle = theme => {
	const themeStyle = {
		backgroundColor: 'black',
		borderRadius: 50
	};

	switch(theme){
		case 'a':
			themeStyle.fontSize = '26px';
			themeStyle.color = 'white';
			themeStyle.padding = 6;
			return themeStyle;

		case 'e':
			themeStyle.fontSize = '20px';
			themeStyle.color = 'rgb(50,200,50)';
			themeStyle.padding = 10;
			return themeStyle;

		case 'o':
			themeStyle.fontSize = '26px';
			themeStyle.color = 'rgb(50,100,240)';
			themeStyle.padding = 6;
			return themeStyle;
	}
};

function formatDate(d){
	if(!d) return '';

	return d.toISOString().substr(0, 10);
}
