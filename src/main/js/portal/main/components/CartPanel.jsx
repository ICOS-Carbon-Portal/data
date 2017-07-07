import React, { Component } from 'react';
import CartIcon from './CartIcon.jsx';
import PreviewIcon from './PreviewIcon.jsx';
import EditablePanelHeading from './EditablePanelHeading.jsx';


export default class CartPanel extends Component {
	constructor(props){
		super(props);
		this.state = {
			selectedItemId: props.previewitemId
		};
	}

	handleClick(id){
		this.setState({selectedItemId: id});
	}

	handleSaveCartName(newName){
		if (this.props.setCartName) this.props.setCartName(newName);
	}

	render(){
		const {cart, removeFromCart, previewItemAction, getSpecLookupType} = this.props;

		return (
			<div className="panel panel-default">
				<EditablePanelHeading
					editValue={cart.name}
					saveValueAction={this.handleSaveCartName.bind(this)}
					iconEditClass="glyphicon glyphicon-edit"
					iconEditTooltip="Change name of cart"
					iconSaveClass="glyphicon glyphicon-floppy-save"
					iconSaveTooltip="Save new cart name"
				/>

				<div className="panel-body">{
					cart.count
						? <ul className="list-group">{
							cart.items.map((item, i) =>
								<Item
									item={item}
									previewType={getSpecLookupType(item.spec)}
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
	const {item, selected, removeFromCart, previewItemAction, clickAction, previewType} = props;

	const action = () => {
		clickAction(props.item.id);
		previewItemAction(props.item.id);
	};

	const className = selected
		? "list-group-item list-group-item-info"
		: "list-group-item";

	return (
		<li className={className}>
			<CartIcon id={item.id} removeFromCart={removeFromCart} isAddedToCart={true} />
			<PreviewIcon id={item.id} previewType={previewType} clickAction={action} />
			<a href={item.id} target="_blank">{item.itemName}</a>
		</li>
	);
};