import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel';
import {setCartName, fetchIsBatchDownloadOk, updateCheckedObjectsInCart, logCartDownloadClick, emptyCart, restoreLastCart} from '../actions/cart';
import {formatBytes, getLastSegmentsInUrls} from '../utils';
import {Sha256Str, UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import {Profile, Route, State} from "../models/State";
import {removeFromCart, updateRoute} from "../actions/common";
import Message from '../components/ui/Message';
import DownloadButton from '../components/buttons/DownloadButton';
import { useDownloadInfo } from '../hooks/useDownloadInfo';

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

	const {preview, user, updateCheckedObjectsInCart, extendedDobjInfo, labelLookup} = props;
	const localObjectsTable = props.cart.items.flatMap((x) => x.knownDataObject ? [x.knownDataObject] : [])
	const downloadInfo = useDownloadInfo({readyObjectIds: localObjectsTable.map((x) => x.dobj), objectsTable: localObjectsTable, extendedDobjInfo, labelLookup});

	function handleDownloadLog() {
		const {name, pids} = props.cart;
		logCartDownloadClick(name, pids);
		// only do if cart download successful:
		//props.removeFromCart(localObjectsTable.map((x) => x.dobj));
		props.emptyCart();
	}

	function handleRestore() {
		props.restoreLastCart();
	}

	const cart = props.cart.name ? props.cart : props.cart.withName(downloadInfo.filename);

	const previewitemId = preview.item ? preview.item.dobj : undefined;
	const downloadTitle = user.email && (user.profile as Profile).icosLicenceOk
		? 'Download cart content'
		: 'Accept license and download cart content';
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
							cart={cart}
						/>
					</div>
					<div className="col-sm-4 col-lg-3">
						<div className="card">
							<div className="card-header">
								{downloadTitle}
							</div>
							<div className="card-body text-center">
								<DownloadButton
									style={{}}
									readyObjectIds={props.cart.items.flatMap((x) => x.knownDataObject ? [x.knownDataObject.dobj] : [])}
									enabled={props.cart.items.length > 0}
									filename={cart.name}
									onSubmitAsForm={handleDownloadLog}
								/>
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
					onclick={() => (handleRouteClick('search'))} 
					onclickSecondary={props.lastCart ? handleRestore : undefined}/>
			}
		</div>
	);
}

function stateToProps(state: State){
	return {
		cart: state.cart,
		lastCart: state.lastCart,
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
		emptyCart: () => dispatch(emptyCart()),
		restoreLastCart: () => dispatch(restoreLastCart()),
	};
}

export default connect(stateToProps, dispatchToProps)(DataCart);
