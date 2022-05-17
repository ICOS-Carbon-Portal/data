import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel';
import {setCartName, fetchIsBatchDownloadOk, updateCheckedObjectsInCart, logCartDownloadClick} from '../actions/cart';
import {formatBytes, getLastSegmentsInUrls} from '../utils';
import {Sha256Str, UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import {Profile, Route, State} from "../models/State";
import {removeFromCart, updateRoute} from "../actions/common";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type DataCartProps = StateProps & DispatchProps;


class DataCart extends Component<DataCartProps> {

	handlePreview(urls: UrlStr[]){
		this.props.updateRoute('preview', getLastSegmentsInUrls(urls));
	}

	handleRouteClick(newRoute: Route){
		this.props.updateCheckedObjectsInCart([]);
		this.props.updateRoute(newRoute);
	}

	handleAllCheckboxesChange() {
		if (this.props.checkedObjectsInCart.length > 0) {
			this.props.updateCheckedObjectsInCart([]);
		} else {
			const checkedObjects = this.props.cart.items.map(item => item.dobj);
			this.props.updateCheckedObjectsInCart(checkedObjects);
		}
	}

	handleFormSubmit(){
		const {name, pids} = this.props.cart;
		logCartDownloadClick(name, pids);
	}

	render(){
		const {preview, user, cart, updateCheckedObjectsInCart} = this.props;
		const previewitemId = preview.item ? preview.item.dobj : undefined;
		const downloadTitle = user.email && (user.profile as Profile).icosLicenceOk
			? 'Download cart content'
			: 'Accept license and download cart content';
		const fileName = cart.name;
		const hashes = JSON.stringify(cart.pids);

		return (
			<div>
				{!cart.isInitialized || cart.count > 0 ?
					<div className="row">
						<div className="col-sm-8 col-lg-9">
							<CartPanel
								previewitemId={previewitemId}
								previewItemAction={this.handlePreview.bind(this)}
								updateCheckedObjects={updateCheckedObjectsInCart}
								handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
								{...this.props}
							/>
						</div>
						<div className="col-sm-4 col-lg-3">
							<div className="card">
								<div className="card-header">
									{downloadTitle}
								</div>
								<div className="card-body text-center">

									<form action="/objects" method="post" onSubmit={this.handleFormSubmit.bind(this)}>
										<input type="hidden" name="fileName" value={fileName} />
										<input type="hidden" name="ids" value={hashes} />

										<button className="btn btn-primary" style={{marginBottom: 15, whiteSpace: 'normal'}}>
											<span className="fas fa-download" style={{marginRight:9}} />Download
										</button>
									</form>

									<div style={{textAlign: 'center', fontSize:'90%'}}>
										Total size: {formatBytes(cart.size)} (uncompressed)
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
		previewLookup: state.previewLookup,
		labelLookup: state.labelLookup,
		user: state.user,
		preview: state.preview,
		checkedObjectsInCart: state.checkedObjectsInCart,
		extendedDobjInfo: state.extendedDobjInfo,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		updateRoute: (route: Route, previewPids?: Sha256Str[]) => dispatch(updateRoute(route, previewPids)),
		setCartName: (newName: string) => dispatch(setCartName(newName)),
		fetchIsBatchDownloadOk: () => dispatch(fetchIsBatchDownloadOk),
		updateCheckedObjectsInCart: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
	};
}

export default connect(stateToProps, dispatchToProps)(DataCart);
