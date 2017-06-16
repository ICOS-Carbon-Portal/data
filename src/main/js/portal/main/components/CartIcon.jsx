import React, { Component } from 'react';
import config from '../config';

export default class CartIcon extends Component {
	constructor(props){
		super(props);
	}

	handleAddToCartClick(){
		const {objInfo, addToCart} = this.props;
		if (addToCart) addToCart(objInfo);
	}

	handleRemoveFromCartClick(){
		const {id, removeFromCart} = this.props;
		if (removeFromCart) removeFromCart(id);
	}

	render(){
		const {isAddedToCart, style} = this.props;

		return(
			<span>{isAddedToCart
				? <span
					style={config.iconStyle}
					title="Remove from data cart"
					className="glyphicon glyphicon-minus-sign text-danger"
					onClick={this.handleRemoveFromCartClick.bind(this)}
				/>
				: <span
					style={config.iconStyle}
					title="Add to data cart"
					className="glyphicon glyphicon-plus-sign text-primary"
					onClick={this.handleAddToCartClick.bind(this)}
				/>
			}</span>
		);
	}
}