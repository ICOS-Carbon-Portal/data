import React, { Component } from 'react';
import CartIcon from './CartIcon.jsx';
import PreviewIcon from './PreviewIcon.jsx';
import EditablePanelHeading from './EditablePanelHeading.jsx';
import YesNoView from './YesNoView.jsx';
import {TESTED_BATCH_DOWNLOAD} from '../actions';


export default class CartPanel extends Component {
	constructor(props){
		super(props);
		this.state = {
			selectedItemId: props.previewitemId,
			yesNoViewVisible: false
		};

		this.mouseClick = undefined;
	}

	componentWillReceiveProps(nextProps){
		if (nextProps.event === TESTED_BATCH_DOWNLOAD && !nextProps.isBatchDownloadOk) {
			this.setState({yesNoViewVisible: true});
		}
	}

	handleItemClick(id){
		this.setState({selectedItemId: id});
	}

	handleSaveCartName(newName){
		if (this.props.setCartName) this.props.setCartName(newName);
	}

	handleDownloadBtnClick(ev){
		this.mouseClick = ev.nativeEvent;
		this.props.fetchIsBatchDownloadOk();
	}

	openLoginWindow(){
		window.open("https://cpauth.icos-cp.eu/");
		this.closeYesNoView();
	}

	closeYesNoView(){
		this.setState({yesNoViewVisible: false});
	}

	render(){
		const {yesNoViewVisible} = this.state;
		const {event, cart, removeFromCart, previewItemAction, getSpecLookupType, isBatchDownloadOk, fetchIsBatchDownloadOk} = this.props;
		// console.log({event, cart, isBatchDownloadOk, fetchIsBatchDownloadOk});

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
					<button className="btn btn-primary" onClick={this.handleDownloadBtnClick.bind(this)} style={{marginBottom: 15}}>
						<span className="glyphicon glyphicon-download-alt"/> Download cart content
					</button>
					{isBatchDownloadOk && event === TESTED_BATCH_DOWNLOAD
						? <iframe src={downloadURL(cart.pids, cart.name)} style={{display:'none'}}></iframe>
						: null
						}

					<YesNoView
						visible={yesNoViewVisible}
						mouseClick={this.mouseClick}
						title={'Login required'}
						question={'You must be logged in to Carbon Portal and have accepted the license agreement before downloading. Do you want to log in and accept the license agreement?'}
						actionYes={{fn: this.openLoginWindow.bind(this)}}
						actionNo={{fn: this.closeYesNoView.bind(this)}}
					/>

					{cart.count
						? <ul className="list-group">{
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
	return `https://data.icos-cp.eu/objects?ids=["${ids.join('","')}"]&fileName=${fileName}`;
};