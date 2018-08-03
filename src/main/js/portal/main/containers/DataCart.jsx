import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import {removeFromCart, setPreviewItem, setPreviewUrl, setCartName, fetchIsBatchDownloadOk, updateCheckedObjectsInCart} from '../actions';
import {formatBytes} from '../utils';
import config from '../config';


class DataCart extends Component {
	constructor(props) {
		super(props);
	}

	handlePreview(id){
		if (this.props.setPreviewItem) this.props.setPreviewItem(id);
	}

	handleCheckboxChange() {
		var checkedObjects = Array.from(document.querySelectorAll('.data-checkbox:checked'))
			.map((checkbox) => checkbox.value);

		this.props.updateCheckedObjects(checkedObjects);
	}

	render(){
		const props = this.props;
		const previewitemId = props.preview.item ? props.preview.item.id : undefined;
		const getSpecLookupType = props.lookup
			? props.lookup.getSpecLookupType.bind(props.lookup)
			: _ => _;
		const downloadTitle = props.user.email && props.user.icosLicenceOk
			? 'Download cart content'
			: 'Accept license and download cart content';

		return (
			<div>
				{props.cart.count > 0 ?
					<div className="row">
						<div className="col-sm-6 col-lg-9">
							<CartPanel
								previewitemId={previewitemId}
								getSpecLookupType={getSpecLookupType}
								previewItemAction={this.handlePreview.bind(this)}
								handleCheckboxChange={this.handleCheckboxChange.bind(this)}
								{...props}
							/>
						</div>
						<div className="col-sm-6 col-lg-3">
							<div className="panel panel-default">
								<div className="panel-heading">
									{downloadTitle}
								</div>
								<div className="panel-body text-center">
									<a href={downloadURL(props.cart.pids, props.cart.name)} className="btn btn-primary" style={{marginBottom: 15, whiteSpace: 'normal'}} target="_blank">
										<span className="glyphicon glyphicon-download-alt" style={{marginRight: 5}} /> Download
									</a>
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
						<button className="btn btn-primary" onClick={props.routeAction.bind(this, config.ROUTE_SEARCH)}>
							Find data
						</button>
					</div>
				}
			</div>
		);
	}
}

const downloadURL = (ids, fileName) => {
	const idsValue = encodeURIComponent(`["${ids.join('","')}"]`);
	const fnValue = encodeURIComponent(fileName);
	return `/objects?ids=${idsValue}&fileName=${fnValue}`;
};

function dispatchToProps(dispatch){
	return {
		setPreviewItem: id => dispatch(setPreviewItem(id)),
		setCartName: newName => dispatch(setCartName(newName)),
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		fetchIsBatchDownloadOk: () => dispatch(fetchIsBatchDownloadOk),
		updateCheckedObjects: ids => dispatch(updateCheckedObjectsInCart(ids)),
	};
}

export default connect(state => state, dispatchToProps)(DataCart);
