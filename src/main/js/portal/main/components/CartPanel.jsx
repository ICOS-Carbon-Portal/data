import React, { Component } from 'react';

export default class CartPanel extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {cart, previewItemAction} = this.props;
		console.log({cart, count: cart.count});

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">{cart.name}</h3>
				</div>
				<div className="panel-body">{
					cart.count
						? <ul className="list-group">{
							cart.items.map((item, i) =>
								<Item item={item} previewItemAction={previewItemAction} key={'ci' + i}/>
							)}
						</ul>
						: <div>Your cart is empty</div>
				}</div>
			</div>
		);
	}
}

const Item = props => {
	const icoStyle = {fontSize: '120%', float: 'right', cursor: 'pointer'};
	console.log({item: props.item});

	function previewItemClick(){
		props.previewItemAction(props.item.id);
	}

	return (
		<li className="list-group-item">
			{props.item.itemName}
			<span style={icoStyle} onClick={previewItemClick} className="glyphicon glyphicon-eye-open" />
		</li>
	);
};