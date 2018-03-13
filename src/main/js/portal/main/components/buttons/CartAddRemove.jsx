import React, { Component } from 'react';


export default class CartAddRemove extends Component{
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
		const {isAddedToCart, objInfo, style} = this.props;

		return(
			<div style={style}>{objInfo && objInfo.level === 0
				? <a className="btn btn-primary" href="http://www.google.com" target="_blank">
					<span className="glyphicon glyphicon-link" /> Available upon request
				</a>
				: isAddedToCart
					? <button onClick={this.handleRemoveFromCartClick.bind(this)} className="btn btn-primary">
						<span className="glyphicon glyphicon-minus-sign" /> Remove from data cart
					</button>
					: <button onClick={this.handleAddToCartClick.bind(this)} className="btn btn-primary">
						<span className="glyphicon glyphicon-plus-sign" /> Add to data cart
					</button>
			}</div>
		);
	}
}