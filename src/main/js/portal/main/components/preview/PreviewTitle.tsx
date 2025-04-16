import React, { Component } from 'react';
import { connect } from "react-redux";
import { addToCart, removeFromCart } from '../../actions/common';
import { UrlStr } from '../../backend/declarations';
import CartItem, { addingToCartProhibition } from '../../models/CartItem';
import { State } from '../../models/State';
import { PortalDispatch } from '../../store';
import { getUrlWithEnvironmentPrefix, specLabelDisplay } from '../../utils';
import CartBtn from '../buttons/CartBtn';
import DownloadButton from '../buttons/DownloadButton';

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps;

class PreviewTitle extends Component<OurProps>{
	render() {

		const { items, extendedDobjInfo, labelLookup, cart } = this.props;
		if (items.length == 0 || items[0].type == undefined) return null;
		const specLabel = labelLookup[items[0].spec]?.label ?? "Undefined data type";
		const title = items.length > 1 ? specLabelDisplay(specLabel) : extendedDobjInfo[0].title ?? extendedDobjInfo[0].biblioInfo?.title ?? items[0].fileName;
		const subtitle = items.length == 1 ? <div className="fs-3 text-muted">{extendedDobjInfo[0].biblioInfo?.temporalCoverageDisplay}</div> : null;
		const metadataButton = items.length == 1 ? getUrlWithEnvironmentPrefix(items[0].dobj) : '';

		const allowCartAdd = items
			.map(addingToCartProhibition)
			.every(cartProhibition => cartProhibition.allowCartAdd);
		const uiMessage = allowCartAdd ? "" : "One or more data objects in this preview cannot be downloaded";

		const areItemsInCart: boolean = items.reduce((prevVal: boolean, item: CartItem) => cart.hasItem(item.dobj), false);
		const actionButtonType = areItemsInCart ? 'remove' : 'add';
		const buttonAction = areItemsInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);

		return (
			<>
				<h1 className="col-md-8">
					{title}
				</h1>
				<div className='col-auto ms-md-auto d-flex gap-1 py-2'>
					<CartBtn
						style={{}}
						checkedObjects={items.map((item: CartItem) => item.dobj)}
						clickAction={buttonAction}
						enabled={allowCartAdd}
						title={uiMessage}
						type={actionButtonType}
					/>
					<DownloadButton
						style={{}}
						checkedObjects={items.map((item: CartItem) => item.dobj)}
						checkedObjectsInfo={items.flatMap((item: CartItem, idx: number) => item.item ? [{...item.item, extendedDobjInfo: extendedDobjInfo[idx]}] : [])}
						enabled={allowCartAdd}
					/>
				</div>
				<div className="col-md-12">
					<div className='d-sm-flex justify-content-between align-items-end mb-4 pb-2'>
						<div>{subtitle}</div>

					</div>
					<ul className="nav nav-tabs">
						<li className="nav-item">
							{items.length == 1 ?
								<a className="nav-link" href={metadataButton}>Metadata</a>
								:
								<details className="nav-link dropdown-details">
									<summary>Metadata</summary>
									<div className='dropdown' style={{ width: 'auto', left: 0, padding: '0.5rem 0' }}>
										{items.map(item => {
											return(
												<a key={item.dobj} className='dropdown-item py-1 px-3' href={getUrlWithEnvironmentPrefix(item.dobj)}>
													<div>{item.itemName}</div>
												</a>
											);
										})}
									</div>
								</details>
							}
						</li>
						<li className="nav-item">
							<a className="nav-link active" aria-current="page" href="#">Preview</a>
						</li>
					</ul>
				</div>
			</>
		);
	}

	handleAddToCart(objInfo: UrlStr[]) {
		this.props.addToCart(objInfo);
	}

	handleRemoveFromCart(objInfo: UrlStr[]) {
		this.props.removeFromCart(objInfo);
	}
}

function stateToProps(state: State) {
	return {
		items: state.preview.items,
		extendedDobjInfo: state.extendedDobjInfo,
		labelLookup: state.labelLookup,
		cart: state.cart,
	};
}

function dispatchToProps(dispatch: PortalDispatch) {
	return {
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
	};
}

export default connect(stateToProps, dispatchToProps)(PreviewTitle);
