import React, { Component } from 'react';
import CartBtn from '../components/buttons/CartBtn.jsx';

export default class Preview extends Component {
	constructor(props){
		super(props);
	}

	handleAddToCart(objInfo) {
		this.props.addToCart(objInfo);
	}

	handleRemoveFromCart(objInfo) {
		this.props.removeFromCart(objInfo);
	}

	render(){
		const {metadata, cart} = this.props;
		const isInCart = cart.hasItem(metadata.id);
		const actionButtonType = isInCart ? 'remove' : 'add';
		const buttonAction = isInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);
		const station = metadata && metadata.specificInfo && metadata.specificInfo.acquisition.station;

		return (
			<div>
				{metadata && metadata.pid
					? <div>
						<div className="row page-header">
							<div className="col-md-9">
								<h1>{metadata.specification.datasetSpec.label}{station && <span> from {station.name}</span>}</h1>
								<h2 className="text-muted">{formatDate(new Date(metadata.specificInfo.acquisition.interval.start))} - {formatDate(new Date(metadata.specificInfo.acquisition.interval.stop))}</h2>
							</div>
							<div className="col-md-3 text-right" style={{marginTop: 30}}>
								<CartBtn
									style={{float: 'right', marginBottom: 10}}
									checkedObjects={[metadata.id]}
									clickAction={buttonAction}
									enabled={true}
									type={actionButtonType}
								/>
							</div>
						</div>
						<div className="row">
							<div className="col-md-9">
								{metadataRow("PID", metadata.pid)}
								{metadataRow("Affiliation", metadata.specification.project.label)}
							</div>
						</div>
					</div>
					: null
				}</div>
		);
	}
}

const metadataRow = (label, value) => {
	return (
		<div className="row">
			<div className="col-md-4">{label}</div>
			<div className="col-md-8">{value}</div>
		</div>
	);
};

function formatDate(d){
	if(!d) return '';

	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function pad2(s){
	return ("0" + s).substr(-2, 2);
}
