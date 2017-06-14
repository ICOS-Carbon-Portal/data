import React, { Component } from 'react';

export default class CollectionIcon extends Component {
	constructor(props){
		super(props);
	}

	handleAddToCollectionClick(){
		const {objInfo, addToCollection} = this.props;
		if (addToCollection) addToCollection(objInfo);
	}

	handleRemoveFromCollectionClick(){
		const {objInfo, removeFromCollection} = this.props;
		if (removeFromCollection) removeFromCollection(objInfo.dobj);
	}

	render(){
		const {addedToCollection, style} = this.props;

		return(
			<span>{addedToCollection
				? <span
					style={style}
					title="Remove from collection"
					className="glyphicon glyphicon-minus-sign text-danger"
					onClick={this.handleRemoveFromCollectionClick.bind(this)}
				/>
				: <span
					style={style}
					title="Add to collection"
					className="glyphicon glyphicon-plus-sign text-primary"
					onClick={this.handleAddToCollectionClick.bind(this)}
				/>
			}</span>
		);
	}
}