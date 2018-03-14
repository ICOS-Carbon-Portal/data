import React, { Component } from 'react';
import {styles} from '../styles';

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
		const {isAddedToCart, objInfo, style} = this.props;

		return(
			<span style={style}>{objInfo && objInfo.level === 0
				? <span
					style={styles.disabledClickIcon}
					title="Data level 0 is available upon request"
					className="glyphicon glyphicon-plus-sign text-muted"
				/>
				: isAddedToCart
					? <span
						style={styles.clickIcon}
						title="Remove from data cart"
						className="glyphicon glyphicon-minus-sign text-danger"
						onClick={this.handleRemoveFromCartClick.bind(this)}
					/>
					: <span
						style={styles.clickIcon}
						title="Add to data cart"
						className="glyphicon glyphicon-plus-sign text-primary"
						onClick={this.handleAddToCartClick.bind(this)}
					/>
			}</span>
		);
	}
}
