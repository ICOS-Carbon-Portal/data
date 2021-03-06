import React, {ChangeEvent, Component} from 'react';
import {connect} from "react-redux";
import PreviewTimeSerie from '../components/preview/PreviewTimeSerie';
import PreviewSelfContained from '../components/preview/PreviewSelfContained';
import CopyValue from '../components/controls/CopyValue';
import config, { PreviewType } from '../config';
import CartBtn from '../components/buttons/CartBtn';
import {Events} from 'icos-cp-utils';
import {State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import CartItem from "../models/CartItem";
import {PortalDispatch} from "../store";
import {addToCart, removeFromCart, setMetadataItem, setPreviewUrl} from "../actions/common";
import {storeTsPreviewSetting} from "../actions/preview";
import {pick} from "../utils";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps
interface OurState {iframeSrc: UrlStr | ''}

class Preview extends Component<OurProps, OurState> {
	private events: typeof Events = null;

	constructor(props: OurProps){
		super(props);

		this.state = {
			iframeSrc: ''
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

	handleAddToCart(objInfo: UrlStr[]) {
		this.props.addToCart(objInfo);
	}

	handleRemoveFromCart(objInfo: UrlStr[]) {
		this.props.removeFromCart(objInfo);
	}

	handleViewMetadata(id: UrlStr) {
		this.props.setMetadataItem(id);
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const {preview, cart} = this.props;
		const previewType = preview.type;
		if(previewType === undefined) return null;

		const areItemsInCart: boolean = preview.items.reduce((prevVal: boolean, item: CartItem) => cart.hasItem(item.dobj), false);
		const actionButtonType = areItemsInCart ? 'remove' : 'add';
		const buttonAction = areItemsInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);

		return (
			<div>
				{preview
					? <div>

						<div className="panel panel-default">
							<div className="panel-heading">
								<span className="panel-title">
									{preview.items.map((item: CartItem) => {
										return (
											<span key={item.dobj} style={{marginRight: 10}}>
												<span style={{marginRight: 10}}>
													{item.itemName}
												</span>
												<span onClick={this.handleViewMetadata.bind(this, item.dobj)} style={{cursor: 'pointer'}} className="glyphicon glyphicon-info-sign" />
											</span>
										);
									})}
								</span>
							</div>

							<div className="panel-body">
								<div className="row">
									<div className="col-sm-10">
										<CopyValue
											btnText="Copy preview chart URL"
											copyHelpText="Click to copy preview chart URL to clipboard"
											valToCopy={previewUrl(preview.items[0], previewType, this.state.iframeSrc)}
										/>
									</div>
									{preview.items &&
									<div className="col-sm-2">
										<CartBtn
											style={{float: 'right', marginBottom: 10}}
											checkedObjects={preview.items.map((item: CartItem) => item.dobj)}
											clickAction={buttonAction}
											enabled={true}
											type={actionButtonType}
										/>
									</div>
									}
								</div>

								<PreviewRoute
									iframeSrcChange={this.handleIframeSrcChange.bind(this)}
									{...this.props}
								/>
							</div>
						</div>
					</div>
					: null
				}</div>
		);
	}
}

const PreviewRoute = (props: OurProps & {iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement> | MessageEvent) => void}) => {
	const previewType = props.preview.type;

	if (previewType === config.TIMESERIES){
		const tsProps = pick(props, 'preview', 'extendedDobjInfo', 'tsSettings', 'storeTsPreviewSetting', 'iframeSrcChange');
		return <PreviewTimeSerie {...tsProps} />;

	} else if (previewType === config.NETCDF || previewType === config.MAPGRAPH){
		const scProps = pick(props, 'preview', 'iframeSrcChange');
		return <PreviewSelfContained {...scProps} />;

	} else {
		const msg = props.preview.items.length
			? "This type of preview is not yet implemented"
			: "Fetching data for preview...";

		return <div className="panel-body">{msg}</div>;
	}
};

function previewUrl(item: CartItem, type: PreviewType, iframeSrc: UrlStr): UrlStr {
	if (type === config.TIMESERIES){
		return (item && item.getUrlSearchValue('x') && item.getUrlSearchValue('y')) ? iframeSrc : '';
	} else {
		return item ? iframeSrc : '';
	}
};

function stateToProps(state: State){
	return {
		preview: state.preview,
		cart: state.cart,
		extendedDobjInfo: state.extendedDobjInfo,
		tsSettings: state.tsSettings,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		setPreviewUrl: (url: UrlStr) => dispatch(setPreviewUrl(url)),
		storeTsPreviewSetting: (spec: string, type: string, val: string) => dispatch(storeTsPreviewSetting(spec, type, val)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
	};
}

export default connect(stateToProps, dispatchToProps)(Preview);
