import React, {ChangeEvent, useState, useEffect, useRef, useCallback} from 'react';
import config, {PreviewType} from '../../config';
import {getLastSegmentInUrl} from "../../utils";
import {State} from "../../models/State";
import { Sha256Str, UrlStr } from '../../backend/declarations';
import { debounce } from 'icos-cp-utils';
import CartItem from '../../models/CartItem';
import { PreviewSettings } from '../../models/Preview';


interface OurProps {
	preview: State['preview'];
	iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement>) => void;
	previewSettings: PreviewSettings
}

export default function PreviewSelfContained({ preview, iframeSrcChange, previewSettings }: OurProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const [height, setHeight] = useState<number>(() => getInitialHeight(preview.type));
	const src = useRef<string>(preview.type ? getPreviewIframeUrl(preview.type, preview.item, previewSettings) : "");

	const handleResize = useCallback(debounce(() => {
		if (iframeRef.current) {
			updateHeight(iframeRef.current);
		}
	}), []);

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.target instanceof HTMLInputElement) return;

		iframeRef.current?.contentWindow?.postMessage({keydown: event.key});
	};

	useEffect(() => {
		window.addEventListener("resize", handleResize);
		document.addEventListener("keydown", handleKeydown);
		return () => {
			window.removeEventListener("resize", handleResize);
			document.removeEventListener("keydown", handleKeydown);
		};
	}, [handleResize, handleKeydown]);

	const updateHeight = (iframe: HTMLIFrameElement) => {
		if (shouldUpdateHeight(preview.type) && iframe.contentWindow) {
			setHeight(iframe.contentWindow.document.body.scrollHeight + 25);
		}
	};

	const handleLoad = (event: ChangeEvent<HTMLIFrameElement>) => {
		iframeSrcChange(event);
		setTimeout(() => updateHeight(event.target), 300);
	};

	return (
		<div className="row" style={{ height }}>
			<iframe ref={iframeRef} onLoad={handleLoad} src={src.current} loading="lazy" />
		</div>
	);

}

function getInitialHeight(previewType?: PreviewType): number {
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

function settingsToQueryParams(previewSettings: PreviewSettings): string {
	const remapKey = (key: string) => `${key}=${previewSettings[key as keyof PreviewSettings]}`;
	return Object.keys(previewSettings).map(remapKey).join("&");
}

function settingsToHash(objId: Sha256Str, previewSettings: PreviewSettings): string {
	return encodeURIComponent(decodeURIComponent(JSON.stringify({objId, ...previewSettings})));
}

function getPreviewIframeUrl(previewType: PreviewType, item: CartItem, previewSettings: PreviewSettings): UrlStr {
	const iFrameBaseUrl = config.iFrameBaseUrl[previewType];
	// Use preview.item.url if present since that one has all client changes recorded in history
	if (item.url) {
		return iFrameBaseUrl + getLastSegmentInUrl(item.url);
	}
	const hashId = getLastSegmentInUrl(item.dobj);
	switch (previewType) {
		case config.PHENOCAM:
			return `${iFrameBaseUrl}?objId=${hashId}${previewSettings.img ? `&img=${previewSettings.img}` : ''}`;
		case config.MAPGRAPH:
			return `${iFrameBaseUrl}${hashId}#${settingsToHash(hashId, previewSettings)}`;
		case config.NETCDF:
			return `${iFrameBaseUrl}${hashId}?${settingsToQueryParams(previewSettings)}`;
	}
	return iFrameBaseUrl + hashId;
}
