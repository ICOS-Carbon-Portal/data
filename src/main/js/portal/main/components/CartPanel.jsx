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

		this.mouseClick = undefined;
	}

	handleItemClick(id){
		this.setState({selectedItemId: id});
	}

	handleSaveCartName(newName){
		if (this.props.setCartName) this.props.setCartName(newName);
	}

	render(){
		const {batchDownloadStatus, cart, removeFromCart, previewItemAction,
			getSpecLookupType, fetchIsBatchDownloadOk, user} = this.props;
		const downloadBtnTxt = user.email && user.icosLicenceOk
			? 'Download cart content'
			: 'Accept license and download cart content';

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

				<div className="panel-body">
					{cart.count
						? <div>
							<a href={downloadURL(cart.pids, cart.name)} className="btn btn-primary" style={{marginBottom: 15}} target="_blank">
								<span className="glyphicon glyphicon-download-alt" style={{marginRight: 5}} /> {downloadBtnTxt}
							</a>

							<ul className="list-group">{
								cart.items.map((item, i) =>
									<Item
										item={item}
										previewType={getSpecLookupType(item.spec)}
										selected={this.state.selectedItemId === item.id}
										removeFromCart={removeFromCart}
										previewItemAction={previewItemAction}
										clickAction={this.handleItemClick.bind(this)}
										key={'ci' + i}
									/>
								)}
							</ul>
						</div>
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

const downloadURL = (ids, fileName) => {
	const idsValue = encodeURIComponent(`["${ids.join('","')}"]`);
	const fnValue = encodeURIComponent(fileName);
	return `/objects?ids=${idsValue}&fileName=${fnValue}`;
};

