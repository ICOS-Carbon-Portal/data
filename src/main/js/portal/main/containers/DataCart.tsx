import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel';
import {setCartName, fetchIsBatchDownloadOk, updateCheckedObjectsInCart, logCartDownloadClick} from '../actions/cart';
import {formatBytes, getLastSegmentsInUrls} from '../utils';
import {Sha256Str, UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import {Profile, Route, State} from "../models/State";
import {removeFromCart, updateRoute} from "../actions/common";
import Message from '../components/ui/Message';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type DataCartProps = StateProps & DispatchProps;


function DataCart(props: DataCartProps) {

	function handlePreview(urls: UrlStr[]){
		props.updateRoute('preview', getLastSegmentsInUrls(urls));
	}

	function handleRouteClick(newRoute: Route){
		props.updateCheckedObjectsInCart([]);
		props.updateRoute(newRoute);
	}

	function handleAllCheckboxesChange() {
		if (props.checkedObjectsInCart.length > 0) {
			props.updateCheckedObjectsInCart([]);
		} else {
			const checkedObjects = props.cart.items.map(item => item.dobj);
			props.updateCheckedObjectsInCart(checkedObjects);
		}
	}

	function handleFormSubmit(){
		const {name, pids} = props.cart;
		logCartDownloadClick(name, pids);
	}

	const {preview, user, cart, updateCheckedObjectsInCart} = props;
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
							previewItemAction={handlePreview}
							updateCheckedObjects={updateCheckedObjectsInCart}
							handleAllCheckboxesChange={handleAllCheckboxesChange}
							{...props}
						/>
					</div>
					<div className="col-sm-4 col-lg-3">
						<div className="card">
							<div className="card-header">
								{downloadTitle}
							</div>
							<div className="card-body text-center">

								<form action="/objects" method="post" onSubmit={handleFormSubmit} target="_blank">
									<input type="hidden" name="fileName" value={fileName} />
									<input type="hidden" name="ids" value={hashes} />

									<button className="btn btn-warning" style={{marginBottom: 15, whiteSpace: 'normal'}}>
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
				<Message
					title="Your cart is empty"
					onclick={() => handleRouteClick('search')} />
			}
		</div>
	);
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
