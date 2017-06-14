import React, { Component } from 'react';
import { connect } from 'react-redux';
import CollectionPanel from '../components/CollectionPanel.jsx';
import Preview from '../components/Preview.jsx';


class Collections extends Component {
	constructor(props) {
		super(props);
		this.state = {
			selectedItem: undefined
		}
	}

	handleSelectItem(id){
		this.setState({selectedItem: this.props.collection.item(id)});
	}

	render(){
		return (
			<div className="row">
				<div className="col-md-4">
					<CollectionPanel collection={this.props.collection} selectItemAction={this.handleSelectItem.bind(this)} />
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

export default connect(state => state, dispatchToProps)(Collections);
