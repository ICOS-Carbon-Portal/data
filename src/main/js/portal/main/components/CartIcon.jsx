import React, { Component } from 'react';

export default class CartIcon extends Component {
	constructor(props){
		super(props);
	}

	handleAddToCartClick(){
		const {objInfo, addToCart} = this.props;
		if (addToCart) addToCart(objInfo);
	}

	handleRemoveFromCartClick(){
		const {objInfo, removeFromCart} = this.props;
		if (removeFromCart) removeFromCart(objInfo.dobj);
	}

	render(){
		const {addedToCart, style} = this.props;

		return(
			<span>{addedToCart
				? <span
					style={style}
					title="Remove from data cart"
					className="glyphicon glyphicon-minus-sign text-danger"
					onClick={this.handleRemoveFromCartClick.bind(this)}
				/>
				: <span
					style={style}
					title="Add to data cart"
					className="glyphicon glyphicon-plus-sign text-primary"
					onClick={this.handleAddToCartClick.bind(this)}
				/>
			}</span>
		);
	}
}