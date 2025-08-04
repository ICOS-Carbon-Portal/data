import React, {ChangeEvent, Component, ReactNode} from 'react';
import {connect} from "react-redux";
import PreviewTimeSerie from '../components/preview/PreviewTimeSerie';
import PreviewSelfContained from '../components/preview/PreviewSelfContained';
import config from '../config';
import {Events} from 'icos-cp-utils';
import {Route, State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import { addToCart, removeFromCart, setPreviewUrl, updateRoute } from "../actions/common";
import { storeTsPreviewSetting } from "../actions/preview";
import { pick } from "../utils";
import PreviewControls from '../components/preview/PreviewControls';
import Message from '../components/ui/Message';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & { HelpSection: ReactNode }
interface OurState {
	iframeSrc: UrlStr | ''
}

class Preview extends Component<OurProps, OurState> {
	private events: typeof Events = null;

	constructor(props: OurProps){
		super(props);

		this.state = {
			iframeSrc: '',
		};

		this.events = new Events();
		this.events.addToTarget(window, "message", this.handleIframeSrcChange.bind(this));
	}

	handleIframeSrcChange(event: ChangeEvent<HTMLIFrameElement> | MessageEvent){
		const iframeSrc = event instanceof MessageEvent
			? event.data
			: event.target.src;

		if (typeof iframeSrc === "string") {
			this.setState({iframeSrc});
			this.props.setPreviewUrl(iframeSrc);
		}
	}

	handleSearchRouteClick() {
		this.props.updateRoute('search');
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const { HelpSection, preview } = this.props;
		const { iframeSrc } = this.state;

		if (!preview || preview.type === undefined) {
			return(
				<Message
					title="No data found"
					findData={this.handleSearchRouteClick.bind(this)} />
			)
		} else {
			return (
				<>
					<div style={{ display: 'inline-block' }}>
						{HelpSection}
					</div>

					<PreviewRoute
						iframeSrcChange={this.handleIframeSrcChange.bind(this)}
						iframeUrl={iframeSrc}
						{...this.props}
					/>
				</>
			);
		}
	}
}

const PreviewRoute = (props: OurProps & { iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement> | MessageEvent) => void, iframeUrl: UrlStr }) => {
	const previewType = props.preview.type;

	if (previewType === config.TIMESERIES){
		const tsProps = pick(props, 'preview', 'extendedDobjInfo', 'tsSettings', 'storeTsPreviewSetting', 'iframeSrcChange',  'previewSettings');
		return <PreviewTimeSerie {...tsProps} />;

	} else if (previewType === config.NETCDF || previewType === config.MAPGRAPH || previewType === config.PHENOCAM){
		const scProps = pick(props, 'preview', 'iframeSrcChange', 'previewSettings');
		return <>
			<div className='row pb-3'>
				<PreviewControls iframeUrl={props.iframeUrl} previewType={previewType} />
			</div>
			<PreviewSelfContained {...scProps} />
		</>;

	} else {
		const msg = props.preview.items.length
			? "This type of preview is not yet implemented"
			: "Fetching data for preview...";

		return <div className="card-body">{msg}</div>;
	}
};

function stateToProps(state: State){
	return {
		preview: state.preview,
		extendedDobjInfo: state.extendedDobjInfo,
		tsSettings: state.tsSettings,
		previewSettings: state.previewSettings,
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		setPreviewUrl: (url: UrlStr) => dispatch(setPreviewUrl(url)),
		storeTsPreviewSetting: (spec: string, type: string, val: string) => dispatch(storeTsPreviewSetting(spec, type, val)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		updateRoute: (route: Route) => dispatch(updateRoute(route)),
	};
}

export default connect(stateToProps, dispatchToProps)(Preview);
