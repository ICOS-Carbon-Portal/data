import React, { Component } from 'react';

export default class CopyUrl extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {iframeSrc} = this.props;
		console.log({iframeSrc});

		return(
			<span
				className="glyphicon glyphicon-copy"
				style={{float: 'right', fontSize: '170%', cursor: 'pointer', marginRight: 30}}
				title="Copy url to preview"
			/>
		);
	}
}