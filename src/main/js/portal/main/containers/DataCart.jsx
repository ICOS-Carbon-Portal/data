import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartPanel from '../components/CartPanel.jsx';
import {setPreviewItem, setPreviewUrl, setCartName, fetchIsBatchDownloadOk, updateCheckedObjectsInCart} from '../actions';
import {formatBytes} from '../utils';
import config from '../config';
import BackButton from '../components/buttons/BackButton.jsx';


class DataCart extends Component {
	constructor(props) {
		super(props);
	}

	handlePreview(id){
		if (this.props.setPreviewItem) this.props.setPreviewItem(id);
	}

	handleAllCheckboxesChange() {
		if (this.props.checkedObjectsInCart.length > 0) {
			this.props.updateCheckedObjects([]);
		} else {
			const checkedObjects = this.props.objectsTable.reduce((acc, o) => {
				if (o.level > 0) acc.push(o.dobj);
				return acc;
			}, []);
			this.props.updateCheckedObjects(checkedObjects);
		}
	}

	render(){
		const props = this.props;
		const previewitemId = props.preview.item ? props.preview.item.id : undefined;
		const getSpecLookupType = props.lookup
			? props.lookup.getSpecLookupType.bind(props.lookup)
			: _ => _;
		const downloadTitle = props.user.email && props.user.icosLicenceOk
			? 'Download cart content'
			: 'Accept license and download cart content';
		const fileName = props.cart.name;
		const hashes = props.cart.pids.join('|');

		return (
			<div>
				<BackButton action={props.backButtonAction} previousRoute={config.ROUTE_SEARCH}/>
				{props.cart.count > 0 ?
					<div className="row">
						<div className="col-sm-8 col-lg-9">
							<CartPanel
								previewitemId={previewitemId}
								getSpecLookupType={getSpecLookupType}
								previewItemAction={this.handlePreview.bind(this)}
								updateCheckedObjects={props.updateCheckedObjects}
								handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
								{...props}
							/>
						</div>
						<div className="col-sm-4 col-lg-3">
							<div className="panel panel-default">
								<div className="panel-heading">
									{downloadTitle}
								</div>
								<div className="panel-body text-center">

									<form action="/objects" method="post" target="_blank">
										<input type="hidden" name="fileName" value={fileName} />
										<input type="hidden" name="hashes" value={hashes} />

										<button className="btn btn-primary" style={{marginBottom: 15, whiteSpace: 'normal'}}>
											<span className="glyphicon glyphicon-download-alt" style={{marginRight:9}} />Download
										</button>
									</form>

									<div style={{textAlign: 'center', fontSize:'90%'}}>
										Total size: {formatBytes(props.cart.size)} (uncompressed)
									</div>
								</div>
							</div>
						</div>
					</div>
					:
					<div className="text-center" style={{margin: '5vh 0'}}>
						<h2>Your cart is empty</h2>
						<p>Search for data and add it to your cart.</p>
						<button className="btn btn-primary" onClick={props.routeAction.bind(this, config.ROUTE_SEARCH)}>
							Find data
						</button>
					</div>
				}
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {
		setPreviewItem: id => dispatch(setPreviewItem(id)),
		setCartName: newName => dispatch(setCartName(newName)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		fetchIsBatchDownloadOk: () => dispatch(fetchIsBatchDownloadOk),
		updateCheckedObjects: ids => dispatch(updateCheckedObjectsInCart(ids)),
	};
}

export default connect(state => state.toPlainObject, dispatchToProps)(DataCart);
