import React, { Component } from 'react';


export default class FileDownload extends Component{
	constructor(props){
		super(props);

		this.ts = 0;
	}

	componentDidUpdate(prevProps) {
		const {ts, blob, fileName} = this.props;

		if (ts !== this.ts && blob && fileName) {
			this.ts = ts;
			this.link.href = window.URL.createObjectURL(blob);
			this.link.download = fileName;
			this.link.click();
		}
	}

	render(){
		return (
			<a ref={a => this.link = a} style={{display:'none'}}>Download</a>
		);
	}
}
