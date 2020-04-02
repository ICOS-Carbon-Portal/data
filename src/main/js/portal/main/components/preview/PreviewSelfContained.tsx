import React, {ChangeEvent, Component, CSSProperties} from 'react';
import config, {PreviewType} from '../../config';
import {getLastSegmentInUrl} from "../../utils";
import {State} from "../../models/State";


interface OurProps {
	preview: State['preview']
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void
}

type OurPreviewType = PreviewType | 'unknown'

export default class PreviewSelfContained extends Component<OurProps>{
	shouldComponentUpdate(nextProps: OurProps){
		// Prevent preview component from updating iframe src if we are viewing the same data object
		return this.props.preview.item.id !== nextProps.preview.item.id;
	}

	render(){
		const {preview, iframeSrcChange} = this.props;
		// Use preview.item.url if present since that one has all client changes recorded in history
		const url = preview.item.url ? preview.item.url : preview.item.id;
		const iFrameBaseUrl = config.iFrameBaseUrl[preview.type];
		const src = `${iFrameBaseUrl}${getLastSegmentInUrl(url)}`;
		const containerStyle: CSSProperties = {position: 'relative', width: '100%', height: getHeight(preview.type), padding: '20%'};
		const iframeStyle: CSSProperties = {border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'};

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

const getHeight = (previewType: OurPreviewType) => {
	switch(previewType){
		case config.NETCDF: return 600;
		case config.MAPGRAPH: return 1100;
		default: return 600;
	}
};
