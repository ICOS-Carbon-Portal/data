import React, { Component } from 'react';

export default class CartAddBtn extends Component {
	constructor(props){
		super(props);
	}

	handleAddToCartClick(){
		const {checkedObjects, addToCart} = this.props;
		if (addToCart) addToCart(checkedObjects);
	}

	render(){
		const {isAddedToCart, style, enabled} = this.props;
		const className = "btn btn-primary " + (enabled ? "" : "disabled");

		return (
			<div style={style}>
				<button id="add-to-cart-button" onClick={this.handleAddToCartClick.bind(this)} className={className}>
					Add to cart
				</button>
			</div>
		);
	}
}
