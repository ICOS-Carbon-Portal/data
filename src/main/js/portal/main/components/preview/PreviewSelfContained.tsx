import React, {ChangeEvent, Component, CSSProperties} from 'react';
import config, {PreviewType} from '../../config';
import {getLastSegmentInUrl} from "../../utils";
import {State} from "../../models/State";


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

		// Use preview.item.url if present since that one has all client changes recorded in history
		const url = preview.item.url ? preview.item.url : preview.item.dobj;
		const iFrameBaseUrl = config.iFrameBaseUrl[previewType];
		const src = `${iFrameBaseUrl}${getLastSegmentInUrl(url)}`;
		const containerStyle: CSSProperties = { height: getHeight(preview.type) };

		return (
			<div className="row" style={containerStyle}>
				<IframeIfPreview preview={preview} iframeSrcChange={iframeSrcChange} src={src} />
			</div>
		);
	}
}

interface IframeProps extends OurProps {
	src: string
}
const IframeIfPreview = ({ preview, iframeSrcChange, src }: IframeProps) => {
	return preview
		? <iframe onLoad={iframeSrcChange} src={src} />
		: null;
};

function getHeight(previewType?: PreviewType): number {
	switch(previewType){
		case config.NETCDF: return window.innerHeight - 100;
		case config.MAPGRAPH: return 1100;
		default: return 600;
	}
};
