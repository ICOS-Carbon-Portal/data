import React, { Component } from 'react';

export default class CollectionPanel extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {collection, selectItemAction} = this.props;
		// console.log({collection});

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">{collection.name}</h3>
				</div>
				<div className="panel-body">
					<ul className="list-group">{
						collection.items.map((item, i) =>
							<CollectionItem item={item} selectItemAction={selectItemAction} key={'ci' + i} />
						)}
					</ul>
				</div>
			</div>
		);
	}
}

const CollectionItem = props => {
	const icoStyle = {fontSize: '120%', float: 'right'};

	return (
		<li className="list-group-item">
			{props.item.itemName}
			<span style={icoStyle} onClick={props.selectItemAction} className="glyphicon glyphicon-eye-open" />
		</li>
	);
};