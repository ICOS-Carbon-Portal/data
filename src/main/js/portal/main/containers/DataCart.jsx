import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import Preview from '../components/Preview.jsx';
import {removeFromCart, setPreviewItem, setPreviewUrl, setPreviewItemSetting, setCartName, fetchIsBatchDownloadOk} from '../actions';


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
		// console.log({props});

		return (
			<div className="row">
				<div className="col-md-4">
					<CartPanel
						user={props.user}
						event={props.event}
						cart={props.cart}
						setCartName={props.setCartName}
						previewitemId={previewitemId}
						getSpecLookupType={props.preview.getSpecLookupType.bind(props.preview)}
						previewItemAction={this.handlePreview.bind(this)}
						removeFromCart={props.removeFromCart}
						batchDownloadStatus={props.batchDownloadStatus}
						fetchIsBatchDownloadOk={props.fetchIsBatchDownloadOk}
					/>
				</div>
				<div className="col-md-8">{
					props.preview.visible
						? <Preview
							preview={props.preview}
							setPreviewItemSetting={props.setPreviewItemSetting}
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
		setPreviewItemSetting: (id, setting, value) => dispatch(setPreviewItemSetting(id, setting, value)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		fetchIsBatchDownloadOk: () => dispatch(fetchIsBatchDownloadOk)
	};
}

export default connect(state => state, dispatchToProps)(DataCart);
