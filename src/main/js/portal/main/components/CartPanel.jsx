import React, { Component } from 'react';
import CartIcon from './CartIcon.jsx';
import PreviewIcon from './PreviewIcon.jsx';


export default class CartPanel extends Component {
	constructor(props){
		super(props);
		this.state = {
			selectedItemId: undefined
		};
	}

	handleClick(id){
		this.setState({selectedItemId: id});
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
									selected={this.state.selectedItemId === item.id}
									removeFromCart={removeFromCart}
									previewItemAction={previewItemAction}
									clickAction={this.handleClick.bind(this)}
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
	const action = () => {
		props.clickAction(props.item.id);
	};

	const className = props.selected
		? "list-group-item list-group-item-info"
		: "list-group-item";

	return (
		<li className={className} onClick={action}>
			<CartIcon id={props.item.id} removeFromCart={props.removeFromCart} isAddedToCart={true} />
			<PreviewIcon id={props.item.id} clickAction={props.previewItemAction} />
			<a href={props.item.id} target="_blank">{props.item.itemName}</a>
		</li>
	);
};