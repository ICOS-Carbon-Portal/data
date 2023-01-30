import React, {ChangeEvent, Component, CSSProperties} from 'react';
import config, {PreviewType} from '../../config';
import {getLastSegmentInUrl} from "../../utils";
import {State} from "../../models/State";
import { PreviewItem } from '../../models/Preview';
import { UrlStr } from '../../backend/declarations';


interface OurProps {
	preview: State['preview']
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void
}

export default class PreviewSelfContained extends Component<OurProps>{
	shouldComponentUpdate(nextProps: OurProps){
		// Prevent preview component from updating iframe src if we are viewing the same data object
		return this.props.preview.item.dobj !== nextProps.preview.item.dobj;
	}

	render(){
		const {preview, iframeSrcChange} = this.props;
		const previewType = preview.type;
		if (previewType === undefined) return null;

		const src = getPreviewIframeUrl(previewType, preview.item)
		const containerStyle: CSSProperties = { height: getHeight(preview.type) };

		return (
			<div className="row" style={containerStyle}>
				<iframe onLoad={iframeSrcChange} src={src} />
			</div>
		);
	}
}

function getHeight(previewType?: PreviewType): number {
	switch(previewType){
		case config.NETCDF: return window.innerHeight - 100;
		case config.MAPGRAPH: return 1100;
		case config.PHENOCAM: return 1100;
		default: return 600;
	}
}

function getPreviewIframeUrl(previewType: PreviewType, item: PreviewItem): UrlStr{
	const iFrameBaseUrl = config.iFrameBaseUrl[previewType]
	// Use preview.item.url if present since that one has all client changes recorded in history
	if(item.url) return iFrameBaseUrl + getLastSegmentInUrl(item.url)
	const hashId = getLastSegmentInUrl(item.dobj)
	if(previewType === config.PHENOCAM) return `${iFrameBaseUrl}?objId=${hashId}`
	return iFrameBaseUrl + hashId
}
