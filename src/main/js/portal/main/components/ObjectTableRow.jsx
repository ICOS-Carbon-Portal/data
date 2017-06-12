import React, { Component } from 'react';

export default class ObjectTableRow extends Component {
	constructor(props){
		super(props);
	}

	handleClick(){
		console.log({objInfo: this.props});
	}

	render(){
		const props = this.props;

		return <tr>
			<td>
				<span
					style={{marginRight: 10, cursor: 'pointer', fontSize: '130%'}}
					title="Add to collection"
					className="glyphicon glyphicon-shopping-cart"
					onClick={this.handleClick.bind(this)}
				/>
				<a href={props.dobj} target="_blank">{stripExt(props.fileName)}</a>
			</td>
			<td>{formatDate(props.submTime)}</td>
			<td>{formatDate(props.acqStart)}</td>
			<td>{formatDate(props.acqEnd)}</td>
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

