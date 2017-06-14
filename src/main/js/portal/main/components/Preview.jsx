import React, { Component } from 'react';

export default class Preview extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {item} = this.props;
		// console.log({item});

		return (
			<div>
			{item
				? <div className="panel panel-default">
					<div className="panel-heading">
						<h3 className="panel-title">Preview of {item.itemName}</h3>
					</div>
					<div className="panel-body">
						The preview
					</div>
				</div>
				: null
			}</div>
		);
	}
}
