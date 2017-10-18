import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import Preview from '../components/Preview.jsx';
import {removeFromCart, setPreviewItem, setPreviewUrl, setCartName, fetchIsBatchDownloadOk} from '../actions';


class DataCart extends Component {
	constructor(props) {
		super(props);
	}

	handlePreview(id){
		if (this.props.setPreviewItem) this.props.setPreviewItem(id);
	}

	render(){
		const props = this.props;
		const previewitemId = props.preview.item ? props.preview.item.id : undefined;
		const getSpecLookupType = props.lookup
			? props.lookup.getSpecLookupType.bind(props.lookup)
			: _ => _;

		return (
			<div className="row">
				<div className="col-sm-6 col-md-5 col-lg-3">
					<CartPanel
						user={props.user}
						event={props.event}
						cart={props.cart}
						setCartName={props.setCartName}
						previewitemId={previewitemId}
						getSpecLookupType={getSpecLookupType}
						previewItemAction={this.handlePreview.bind(this)}
						removeFromCart={props.removeFromCart}
						batchDownloadStatus={props.batchDownloadStatus}
						fetchIsBatchDownloadOk={props.fetchIsBatchDownloadOk}
					/>
				</div>
				<div className="col-sm-6 col-md-7 col-lg-9">{
					props.preview.visible
						? <Preview
							preview={props.preview}
							setPreviewUrl={props.setPreviewUrl}
						/>
						: null
				}</div>
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {
		setPreviewItem: id => dispatch(setPreviewItem(id)),
		setCartName: newName => dispatch(setCartName(newName)),
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		fetchIsBatchDownloadOk: () => dispatch(fetchIsBatchDownloadOk)
	};
}

export default connect(state => state, dispatchToProps)(DataCart);
