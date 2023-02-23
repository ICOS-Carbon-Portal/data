import React, {ChangeEvent, Component, CSSProperties} from 'react';
import config, {PreviewType} from '../../config';
import {getLastSegmentInUrl} from "../../utils";
import {State} from "../../models/State";
import { PreviewItem } from '../../models/Preview';
import { UrlStr } from '../../backend/declarations';
import { debounce, Events } from 'icos-cp-utils';


interface OurProps {
	preview: State['preview']
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void
}

type OurState = {
	height: number | undefined
}

export default class PreviewSelfContained extends Component<OurProps, OurState>{
	private ref = React.createRef<HTMLIFrameElement>();
	private events: any
	private handleResize: () => void

	constructor(props: OurProps) {
		super(props);

		this.state = {
			height: getHeight(props.preview.type)
		};

		this.events = new Events();

		this.handleResize = debounce(() => {
			this.ref.current && this.setHeight(this.ref.current)
		});
		this.events.addToTarget(window, "resize", this.handleResize);
	}

	setHeight(iframe: HTMLIFrameElement) {
		if (shouldUpdateHeight(this.props.preview.type)) {
			setTimeout(() => {
				iframe.contentWindow && this.setState({ height: iframe.contentWindow.document.body.scrollHeight + 25 })
			}, 100)
		}
	}

	onLoad(event: ChangeEvent<HTMLIFrameElement>) {
		this.props.iframeSrcChange(event)
		this.setHeight(event.target)
	}

	shouldComponentUpdate(nextProps: OurProps, nextState: OurState){
		// Prevent preview component from updating iframe src if we are viewing the same data object
		return this.props.preview.item.dobj !== nextProps.preview.item.dobj
			|| this.state.height !== nextState.height;
	}

	render(){
		const {preview} = this.props;
		const previewType = preview.type;

		if (previewType === undefined) return null;

		const src = getPreviewIframeUrl(previewType, preview.item)

		return (
			<div className="row" style={{ width: '100%', height: this.state.height }}>
				<iframe ref={this.ref} onLoad={this.onLoad.bind(this)} src={src} />
			</div>
		);
	}
}

function getHeight(previewType?: PreviewType): number {
	switch(previewType){
		case config.NETCDF: return Math.max(window.innerHeight - 100, 480);
		case config.MAPGRAPH: return 1100;
		case config.PHENOCAM: return 1100;
		default: return 600;
	}
}

function shouldUpdateHeight(previewType?: PreviewType): boolean {
	switch (previewType) {
		case config.NETCDF: return false;
		case config.PHENOCAM: return false;
		default: return true;
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
