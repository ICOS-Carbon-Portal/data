import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import Preview from '../components/Preview.jsx';
import {removeFromCart, fetchObjColInfo, setCartItemSetting} from '../actions';


class DataCart extends Component {
	constructor(props) {
		super(props);
		this.state = {
			selectedItemId: undefined
		}
	}

	handlePreviewItem(id){
		this.setState({selectedItemId: id});
		if (!this.props.cache.dobjColumns.some(dc => dc.name === id)) {
			this.props.fetchObjColInfo(id);
		}
	}

	render(){
		const props = this.props;
		// console.log({DataCartProps: props});

		return (
			<div className="row">
				<div className="col-md-4">
					<CartPanel
						cart={props.cart}
						dobjColumns={props.cache.dobjColumns}
						previewItemAction={this.handlePreviewItem.bind(this)}
						removeFromCart={props.removeFromCart}
					/>
				</div>
				<div className="col-md-8">
					<Preview
						item={props.cart.item(this.state.selectedItemId)}
						dobjColumns={props.cache.dobjColumns}
						setCartItemSetting={props.setCartItemSetting}
					/>
				</div>
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {
		removeFromCart: id => dispatch(removeFromCart(id)),
		fetchObjColInfo: id => dispatch(fetchObjColInfo(id)),
		setCartItemSetting: (id, setting, value) => dispatch(setCartItemSetting(id, setting, value))
	};
}

export default connect(state => state, dispatchToProps)(DataCart);
