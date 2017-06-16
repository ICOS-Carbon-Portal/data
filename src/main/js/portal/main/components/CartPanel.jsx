import React, { Component } from 'react';
import CartIcon from './CartIcon.jsx';
import PreviewIcon from './PreviewIcon.jsx';


export default class CartPanel extends Component {
	constructor(props){
		super(props);
	}

	handlePreviewClick(id){
		console.log({id, preview: this.props});
	}

	render(){
		const {cart, removeFromCart, previewItemAction} = this.props;
		// console.log({cart, count: cart.count, props: this.props});

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">{cart.name}</h3>
				</div>
				<div className="panel-body">{
					cart.count
						? <ul className="list-group">{
							cart.items.map((item, i) =>
								<Item
									item={item}
									removeFromCart={removeFromCart}
									previewItemAction={previewItemAction}
									key={'ci' + i}
								/>
							)}
						</ul>
						: <div>Your cart is empty</div>
				}</div>
			</div>
		);
	}
}

const Item = props => {
	return (
		<li className="list-group-item">
			<CartIcon id={props.item.id} removeFromCart={props.removeFromCart} isAddedToCart={true} />
			<PreviewIcon id={props.item.id} clickAction={props.previewItemAction} />
			<a href={props.item.id} target="_blank">{props.item.itemName}</a>
		</li>
	);
};