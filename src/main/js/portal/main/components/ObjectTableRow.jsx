import React from 'react';

export default function(props){
	return <tr>
		<td><a href={props.dobj} target="_blank">{props.fileName}</a></td>
		<td>{formatDate(props.submTime)}</td>
		<td>{formatDate(props.acqStart)}</td>
		<td>{formatDate(props.acqEnd)}</td>
	</tr>;
}

function formatDate(d){
	if(!d) return '';
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function pad2(s){
	return ("0" + s).substr(-2, 2);
}

