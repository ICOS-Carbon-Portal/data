import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import Preview from '../components/Preview.jsx';


class DataCart extends Component {
	constructor(props) {
		super(props);
		this.state = {
			selectedItem: undefined
		}
	}

	handlePreviewItem(id){
		// console.log({id});
		this.setState({selectedItem: this.props.cart.item(id)});
	}

	render(){
		return (
			<div className="row">
				<div className="col-md-4">
					<CartPanel cart={this.props.cart} previewItemAction={this.handlePreviewItem.bind(this)} />
				</div>
				<div className="col-md-8">
					<Preview item={this.state.selectedItem}/>
				</div>
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {

	};
}

export default connect(state => state, dispatchToProps)(DataCart);
