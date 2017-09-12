import React, { Component } from 'react';
import config from '../config.js';

export default class PreviewNetCDF extends Component{
	constructor(props){
		super(props);
	}

	shouldComponentUpdate(){
		// Prevent NetCDFMap component from updating iframe src
		return false;
	}

	render(){
		const {preview, iframeSrcChange} = this.props;

		return (
			<div>{preview
				? <div className="panel-body" style={{position: 'relative', width: '100%', height: 600, padding: '20%'}}>
					<NetCDFMap
						self={this}
						preview={preview}
						onLoad={iframeSrcChange}
					/>
				</div>
				: null
			}</div>
		);
	}
}

const NetCDFMap = ({self, preview, onLoad}) => {
	const src = preview.item.url || `${config.iFrameBaseUrl[config.NETCDF]}${preview.item.id.split('/').pop()}/`;

	return (
		<iframe ref={iframe => self.iframe = iframe} onLoad={onLoad}
			style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
			src={src}
		/>
	);
};