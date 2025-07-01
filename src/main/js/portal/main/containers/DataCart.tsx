import React from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel';
import {
	setCartName,
	fetchIsBatchDownloadOk,
	updateCheckedObjectsInCart,
	logCartDownloadClick,
	emptyCart,
	restorePriorCart
} from '../actions/cart';
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

	function handleDownload() {
		logCartDownloadClick(filename, hashes);
		props.emptyCart(filename);
	}

	function handleRestore() {
		props.restorePriorCart();
	}

	const {preview, user, cart, priorCart, updateCheckedObjectsInCart, extendedDobjInfo, labelLookup} = props;
	const localObjectsTable = props.cart.items.flatMap((x) => x.knownDataObject ? [x.knownDataObject] : [])
	const downloadInfo = useDownloadInfo({readyObjectIds: localObjectsTable.map((x) => x.dobj),
		objectsTable: localObjectsTable, extendedDobjInfo, labelLookup});

	const previewitemId = preview.item ? preview.item.dobj : undefined;

	const downloadTitle = user.email && (user.profile as Profile).icosLicenceOk
		? 'Download cart content'
		: 'Accept license and download cart content';

	const filename = cart.count == 0 && priorCart ? priorCart.name : (cart.name ? cart.name : downloadInfo.filename);
	const hashes = cart.count == 0 && priorCart ? priorCart.pids : cart.pids;
	const showCartPanel = !cart.isInitialized || cart.count > 0;

	return (
		<>
			<div style={ showCartPanel ? {} : {display: "none"}}>
				<div className="row">
					<div className="col-sm-8 col-lg-9">
						<CartPanel
							previewitemId={previewitemId}
							previewItemAction={handlePreview}
							updateCheckedObjects={updateCheckedObjectsInCart}
							handleAllCheckboxesChange={handleAllCheckboxesChange}
							downloadInfo={downloadInfo}
							{...props}
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
									filename={filename}
									readyObjectIds={hashes}
									enabled={true}
									onSubmitHandler={handleDownload}
								/>
								<div style={{textAlign: 'center', fontSize:'90%'}}>
									Total size: {formatBytes(cart.size)} (uncompressed)
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div style={ showCartPanel ? {display: "none"} : {}}>
				<Message
					title="Your cart is empty"
					findData={() => handleRouteClick('search')}
					restorePriorCart={priorCart ? handleRestore : undefined}
				/>
			</div>
		</>
	);
}

function stateToProps(state: State){
	return {
		cart: state.cart,
		priorCart: state.priorCart,
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
		emptyCart: (filename: string) => dispatch(emptyCart(filename)),
		restorePriorCart: () => dispatch(restorePriorCart())
	};
}

export default connect(stateToProps, dispatchToProps)(DataCart);
