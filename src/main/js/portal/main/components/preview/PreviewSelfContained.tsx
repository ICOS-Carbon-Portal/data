import React, { ChangeEvent, useState, useEffect, useRef, KeyboardEvent } from 'react';
import config, { PreviewType } from '../../config';
import { getLastSegmentInUrl } from "../../utils";
import { State } from "../../models/State";
import { UrlStr } from '../../backend/declarations';
import { debounce, Events } from 'icos-cp-utils';
import CartItem from '../../models/CartItem';


interface OurProps {
	preview: State['preview'];
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void;
}

export default function PreviewSelfContained({ preview, iframeSrcChange }: OurProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const events = useRef(new Events());
	const [height, setHeight] = useState<number>(() => getInitialHeight(preview.type));

	const handleResize = debounce(() => {
		if (iframeRef.current) {
			updateHeight(iframeRef.current);
		}
	});

	const handleKeydown = (event: KeyboardEvent) => {
		if(event.target instanceof Element && event.target.tagName === "INPUT") return;

		iframeRef.current?.contentWindow?.postMessage({keydown: event.key});
	};

	useEffect(() => {
		events.current.addToTarget(window, "resize", handleResize);
		events.current.addToTarget(document, "keydown", handleKeydown);
		return () => {
			events.current.removeFromTarget(window, "resize", handleResize);
			events.current.removeFromTarget(document, "keydown", handleKeydown);
		};
	}, []);

	const updateHeight = (iframe: HTMLIFrameElement) => {
		if (shouldUpdateHeight(preview.type)) {
			setTimeout(() => {
				if (iframe.contentWindow) {
					setHeight(iframe.contentWindow.document.body.scrollHeight + 25);
				}
			}, 300);
		}
	};

	const handleLoad = (event: ChangeEvent<HTMLIFrameElement>) => {
		iframeSrcChange(event);
		updateHeight(event.target);
	};

	const previewType = preview.type;
	if (previewType === undefined) return null;

	const src = getPreviewIframeUrl(previewType, preview.item);

	return (
		<div className="row" style={{ height }}>
			<iframe ref={iframeRef} onLoad={handleLoad} src={src} />
		</div>
	);

}

function getInitialHeight(previewType?: PreviewType): number {
	switch (previewType) {
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

function getPreviewIframeUrl(previewType: PreviewType, item: CartItem): UrlStr {
	const iFrameBaseUrl = config.iFrameBaseUrl[previewType];
	// Use preview.item.url if present since that one has all client changes recorded in history
	if (item.url) return iFrameBaseUrl + getLastSegmentInUrl(item.url);
	const hashId = getLastSegmentInUrl(item.dobj);
	if (previewType === config.PHENOCAM) return `${iFrameBaseUrl}?objId=${hashId}`;
	return iFrameBaseUrl + hashId;
}
