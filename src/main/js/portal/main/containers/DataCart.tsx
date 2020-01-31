import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import {setCartName, fetchIsBatchDownloadOk, updateCheckedObjectsInCart} from '../actions/cart';
import {formatBytes} from '../utils';
import config from '../config';
import BackButton from '../components/buttons/BackButton.jsx';
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import {Profile, Route, State} from "../models/State";
import {removeFromCart, setMetadataItem, switchToPreview, updateRoute} from "../actions/common";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type DataCartProps = StateProps & DispatchProps;


class DataCart extends Component<DataCartProps> {
	constructor(props: DataCartProps) {
		super(props);
	}

	handlePreview(ids: UrlStr[]){
		this.props.setPreview(ids, 'preview');
	}

	handleBackButton(previousRoute: Route){
		this.props.updateRoute(previousRoute);
	}

	handleRouteClick(newRoute: Route){
		this.props.updateCheckedObjectsInCart([]);
		this.props.updateRoute(newRoute);
	}

	handleAllCheckboxesChange() {
		if (this.props.checkedObjectsInCart.length > 0) {
			this.props.updateCheckedObjectsInCart([]);
		} else {
			const checkedObjects = this.props.cart.items.map(item => item.id);
			this.props.updateCheckedObjectsInCart(checkedObjects);
		}
	}

	render(){
		const props = this.props;
		const previewitemId = props.preview.item ? props.preview.item.id : undefined;
		const getSpecLookupType = props.lookup
			? props.lookup.getSpecLookupType.bind(props.lookup)
			: () => {};
		const downloadTitle = props.user.email && (props.user.profile as Profile).icosLicenceOk
			? 'Download cart content'
			: 'Accept license and download cart content';
		const fileName = props.cart.name;
		const hashes = JSON.stringify(props.cart.pids);

		return (
			<div>
				<BackButton action={this.handleBackButton.bind(this)} previousRoute={'search'}/>
				{props.cart.count > 0 ?
					<div className="row">
						<div className="col-sm-8 col-lg-9">
							<CartPanel
								previewitemId={previewitemId}
								getSpecLookupType={getSpecLookupType}
								previewItemAction={this.handlePreview.bind(this)}
								updateCheckedObjects={props.updateCheckedObjectsInCart}
								handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
								{...props}
							/>
						</div>
						<div className="col-sm-4 col-lg-3">
							<div className="panel panel-default">
								<div className="panel-heading">
									{downloadTitle}
								</div>
								<div className="panel-body text-center">

									<form action="/objects" method="post">
										<input type="hidden" name="fileName" value={fileName} />
										<input type="hidden" name="ids" value={hashes} />

										<button className="btn btn-primary" style={{marginBottom: 15, whiteSpace: 'normal'}}>
											<span className="glyphicon glyphicon-download-alt" style={{marginRight:9}} />Download
										</button>
									</form>

									<div style={{textAlign: 'center', fontSize:'90%'}}>
										Total size: {formatBytes(props.cart.size)} (uncompressed)
									</div>
								</div>
							</div>
						</div>
					</div>
					:
					<div className="text-center" style={{margin: '5vh 0'}}>
						<h2>Your cart is empty</h2>
						<p>Search for data and add it to your cart.</p>
						<button className="btn btn-primary" onClick={this.handleRouteClick.bind(this, 'search')}>
							Find data
						</button>
					</div>
				}
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		cart: state.cart,
		lookup: state.lookup,
		labelLookup: state.labelLookup,
		user: state.user,
		preview: state.preview,
		checkedObjectsInCart: state.checkedObjectsInCart,
		extendedDobjInfo: state.extendedDobjInfo,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		setPreview: (url: UrlStr | UrlStr[], newRoute: Route) => dispatch(switchToPreview(url, newRoute)),
		updateRoute: (route: Route) => dispatch(updateRoute(route)),
		setCartName: (newName: string) => dispatch(setCartName(newName)),
		fetchIsBatchDownloadOk: () => dispatch(fetchIsBatchDownloadOk),
		updateCheckedObjectsInCart: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInCart(ids)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
	};
}

export default connect(stateToProps, dispatchToProps)(DataCart);
