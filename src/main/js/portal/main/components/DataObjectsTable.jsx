import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

const placeholders = {
	fileName: 'File name'
};

export default class DataObjectsTable extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		const objectsTable = this.props.objectsTable;

		return <div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">Data objects</h3>
			</div>
			<div className="panel-body">{
				objectsTable.map((objInfo, i) => <ObjectRow {...objInfo} key={'dobj_' + i} />)
			}</div>
		</div>;
	}
}

const ObjectRow = props => <div className="row">
	<a href={props.dobj} target="_blank">{props.fileName}</a>
</div>

