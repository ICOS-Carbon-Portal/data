import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';
import ScreenHeightColumn from './ScreenHeightColumn.jsx';

const placeholders = {
	fileName: 'File name'
};

export default function(props){
	return <div className="panel panel-default">
		<div className="panel-heading">
			<h3 className="panel-title">Data objects</h3>
		</div>
		<div className="panel-body">
			<ScreenHeightColumn>
				<table className="table">
					<thead>
						<tr>
							<th>Landing page</th>
							<th>Submission time (UTC)</th>
							<th>Acquisition start (UTC)</th>
							<th>Acquisition stop (UTC)</th>
						</tr>
					</thead>
					<tbody>{
						props.objectsTable.map((objInfo, i) => <ObjectRow {...objInfo} key={'dobj_' + i} />)
					}</tbody>
				</table>
			</ScreenHeightColumn>
		</div>
	</div>;
}

const ObjectRow = props => <tr>
	<td><a href={props.dobj} target="_blank">{props.fileName}</a></td>
	<td>{formatDate(props.submTime)}</td>
	<td>{formatDate(props.acqStart)}</td>
	<td>{formatDate(props.acqEnd)}</td>
</tr>

function formatDate(d){
	if(!d) return '';
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function pad2(s){
	return ("0" + s).substr(-2, 2);
}
