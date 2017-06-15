import React, { Component } from 'react';
import CartIcon from './CartIcon.jsx';

export default class ObjectTableRow extends Component {
	constructor(props){
		super(props);
	}

	handlePreviewClick(){
		console.log({objInfo: this.props});
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const icoStyle = {marginRight: 10, cursor: 'pointer', fontSize: '150%', position: 'relative', verticalAlign: 'middle'};

		return <tr>
			<td>
				<CartIcon {...props} style={icoStyle} />
				<span
					style={icoStyle}
					title="Preview data"
					className="glyphicon glyphicon-eye-open"
					onClick={this.handlePreviewClick.bind(this)}
				/>
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

