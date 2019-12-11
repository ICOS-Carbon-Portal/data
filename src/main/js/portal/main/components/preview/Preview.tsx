import React, {ChangeEvent, Component} from 'react';
import PreviewTimeSerie from './PreviewTimeSerie';
import PreviewSelfContained from './PreviewSelfContained';
import CopyValue from '../controls/CopyValue';
import config from '../../config';
import CartBtn from '../buttons/CartBtn';
import {Events} from 'icos-cp-utils';
import {State} from "../../models/State";
import {UrlStr} from "../../backend/declarations";
import CartItem from "../../models/CartItem";


interface OurProps {
	preview: State['preview']
	cart: State['cart']
	extendedDobjInfo: State['extendedDobjInfo']
	tsSettings: State['tsSettings']
	setPreviewUrl: (url: UrlStr) => void
	storeTsPreviewSetting: (spec: string, type: string, val: string) => void
	addToCart: (ids: UrlStr[]) => void
	removeFromCart: (ids: UrlStr[]) => void
	setMetadataItem: (id: UrlStr) => void
}

interface OurState {
	iframeSrc: UrlStr | ''
}

export default class Preview extends Component<OurProps, OurState> {
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
		const areItemsInCart: boolean = preview.items.reduce((prevVal: boolean, item: CartItem) => cart.hasItem(item.id), false);
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
											<span key={item.id} style={{marginRight: 10}}>
												<span style={{marginRight: 10}}>
													{item.itemName}
												</span>
												<span onClick={this.handleViewMetadata.bind(this, item.id)} style={{cursor: 'pointer'}} className="glyphicon glyphicon-info-sign" />
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
											valToCopy={previewUrl(preview.items[0], preview.type, this.state.iframeSrc)}
										/>
									</div>
									{preview.items &&
										<div className="col-sm-2">
											<CartBtn
												style={{float: 'right', marginBottom: 10}}
												checkedObjects={preview.items.map((item: CartItem) => item.id)}
												clickAction={buttonAction}
												enabled={true}
												type={actionButtonType}
											/>
										</div>
									}
								</div>
							</div>

							<PreviewRoute iframeSrcChange={this.handleIframeSrcChange.bind(this)} {...this.props} />

						</div>
					</div>
					: null
				}</div>
		);
	}
}

const PreviewRoute = (props: OurProps & {iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement> | MessageEvent) => void}) => {
	switch (props.preview.type){

		case config.TIMESERIES:
			return <PreviewTimeSerie {...props} />;

		case config.NETCDF:
			return <PreviewSelfContained {...props} />;

		case config.MAPGRAPH:
			return <PreviewSelfContained {...props} />;

		default:
			const msg = props.preview.items.length
				? "This type of preview is not yet implemented"
				: "Fetching data for preview...";

			return <div className="panel-body">{msg}</div>;
	}
};

const previewUrl = (item: CartItem, type: string, iframeSrc: UrlStr) => {
	if (type === config.TIMESERIES){
		return (item && item.getUrlSearchValue('x') && item.getUrlSearchValue('y')) ? iframeSrc : '';
	} else {
		return item ? iframeSrc : '';
	}
};
