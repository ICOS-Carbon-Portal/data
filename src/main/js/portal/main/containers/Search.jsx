import React, { Component } from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import DataObjectsTable from '../components/DataObjectsTable.jsx';
import Preview from '../components/Preview.jsx';
import {/*queryMeta, reset, */specFilterUpdate, toggleSort, requestStep, addToCart, removeFromCart} from '../actions';
import {setPreviewItemSetting, setPreviewItem, setPreviewVisibility} from '../actions';

class Search extends Component {
	constructor(props) {
		super(props);
	}

	handlePreview(id){
		if (this.props.setPreviewItem) this.props.setPreviewItem(id);
	}

	handleClosePreview(){
		if (this.props.setPreviewVisibility) this.props.setPreviewVisibility(false);
	}

	render(){
		const props = this.props;
		const showPreview = props.previewVisible && props.preview.previewItem && props.preview.previewOptions;
		// console.log({props});

		return (
			<div className="row">
				<div className="col-md-4">
					<ObjSpecFilter {...copyprops(props, ['specTable', 'updateFilter'])} />
				</div>
				<div className="col-md-8">{
					showPreview
						? <Preview
							preview={props.preview}
							setPreviewItemSetting={props.setPreviewItemSetting}
							closePreviewAction={this.handleClosePreview.bind(this)}
						/>
						: <DataObjectsTable
							previewAction={this.handlePreview.bind(this)}
							{...copyprops(props, [
								'objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging', 'previewLookup', 'cart', 'addToCart', 'removeFromCart'
						])}/>
				}</div>
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {
		//queryMeta: (id, search, minLength) => dispatch(queryMeta(id, search, minLength)),
		updateFilter: (varName, values) => dispatch(specFilterUpdate(varName, values)),
		toggleSort: varName => dispatch(toggleSort(varName)),
		requestStep: direction => dispatch(requestStep(direction)),
		setPreviewItem: id => dispatch(setPreviewItem(id)),
		setPreviewVisibility: visibility => dispatch(setPreviewVisibility(visibility)),
		addToCart: objInfo => dispatch(addToCart(objInfo)),
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewItemSetting: (id, setting, value) => dispatch(setPreviewItemSetting(id, setting, value))
	};
}

export default connect(state => state, dispatchToProps)(Search);