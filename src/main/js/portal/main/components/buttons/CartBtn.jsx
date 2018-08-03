import React, { Component } from 'react';

export default class CartBtn extends Component {
	constructor(props){
		super(props);
	}

	handleAddToCartClick(){
		const {checkedObjects, clickAction} = this.props;
		if (clickAction) clickAction(checkedObjects);
	}

	render(){
		const {style, enabled, type} = this.props;
		const btnText = (type === 'remove') ? 'Remove from cart' : 'Add to cart';
		const btnStyle = (type === 'remove') ? 'btn-default' : 'btn-primary';
		const className = `btn ${btnStyle} ${enabled ? "" : "disabled"}`;

		return (
			<div style={style}>
				<button id="add-to-cart-button" onClick={this.handleAddToCartClick.bind(this)} className={className}>
					{btnText}
				</button>
			</div>
		);
	}
}
