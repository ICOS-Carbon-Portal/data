import React, { Component } from 'react';

export default class PreviewCtrlPanel extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">Previewed data objects</h3>
				</div>
				<div className="panel-body">

				</div>
			</div>
		);
	}
}