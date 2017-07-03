import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import Preview from '../components/Preview.jsx';
import {removeFromCart, setPreviewItem, setPreviewItemSetting} from '../actions';


class DataCart extends Component {
	constructor(props) {
		super(props);
	}

	handlePreview(id){
		if (this.props.setPreviewItem) this.props.setPreviewItem(id);
	}

	render(){
		const props = this.props;

		return (
			<div className="row">
				<div className="col-md-4">
					<CartPanel
						cart={props.cart}
						previewLookup={props.previewLookup}
						previewItemAction={this.handlePreview.bind(this)}
						removeFromCart={props.removeFromCart}
					/>
				</div>
				<div className="col-md-8">{
					props.preview.previewItem && props.preview.previewOptions
						? <Preview
							preview={props.preview}
							setPreviewItemSetting={props.setPreviewItemSetting}
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
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewItemSetting: (id, setting, value) => dispatch(setPreviewItemSetting(id, setting, value))
	};
}

export default connect(state => state, dispatchToProps)(DataCart);
