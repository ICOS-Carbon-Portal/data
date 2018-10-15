import React, { Component } from 'react';
import config from '../../config.js';

export default class PreviewSelfContained extends Component{
	constructor(props){
		super(props);
	}

	shouldComponentUpdate(nextProps){
		// Prevent preview component from updating iframe src if we are viewing the same data object
		return this.props.preview.item.id !== nextProps.preview.item.id;
	}

	render(){
		const {preview, iframeSrcChange} = this.props;
		const src = `${config.iFrameBaseUrl[preview.type]}${preview.item.id.split('/').pop()}`;

		const containerStyle = {position: 'relative', width: '100%', height: getHeight(preview.type), padding: '20%'};
		const iframeStyle = {border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'};

		return (
			<div>{preview
				? <div className="panel-body" style={containerStyle}>
					<iframe onLoad={iframeSrcChange} style={iframeStyle} src={src} />
				</div>
				: null
			}</div>
		);
	}
}

const getHeight = previewType => {
	switch(previewType){
		case config.NETCDF: return 600;
		case config.MAPGRAPH: return 980;
		default: return 600;
	}
};
