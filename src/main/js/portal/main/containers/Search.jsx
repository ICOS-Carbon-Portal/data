import React, { Component } from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import Filters from '../components/filters/Filters.jsx';
import Tabs from '../components/Tabs.jsx';
import DataObjectsTable from '../components/DataObjectsTable.jsx';
import SimpleDataObjectsTable from '../components/simpleResult/SimpleDataObjectsTable.jsx';
import Preview from '../components/Preview.jsx';
import {queryMeta, specFilterUpdate, toggleSort, requestStep, addToCart, removeFromCart} from '../actions';
import {setPreviewUrl, setPreviewItem, setPreviewVisibility, specFiltersReset, updateSelectedPids} from '../actions';

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
		const tabs = props.routeAndParams.tabs;
		const searchProps = copyprops(props, ['specTable', 'updateFilter', 'specFiltersReset', 'switchTab',
			'filterTemporal', 'setFilterTemporal', 'queryMeta', 'filterFreeText', 'updateSelectedPids']);
		const hasFilters = props.filterTemporal.hasFilter || props.filterFreeText.hasFilter;
		// console.log({routeAndParams: props.routeAndParams, tabs: props.routeAndParams.tabs});

		return (
			<div className="row">
				<div className="col-md-3">
					<Tabs tabName="searchTab" selectedTabId={tabs.searchTab} switchTab={props.switchTab}>
						<ObjSpecFilter tabHeader="Categories" {...searchProps} />
						<Filters
							tabHeader="Filters"
							filterTemporal={props.filterTemporal}
							setFilterTemporal={props.setFilterTemporal}
							queryMeta={props.queryMeta}
							filterFreeText={props.filterFreeText}
							updateSelectedPids={props.updateSelectedPids}
						/>
					</Tabs>
				</div>
				<div className="col-md-9">
					<Tabs tabName="resultTab" selectedTabId={tabs.resultTab} switchTab={props.switchTab}>
						{props.preview.visible
							? <Preview
								tabHeader="Advanced"
								preview={props.preview}
								setPreviewUrl={props.setPreviewUrl}
								closePreviewAction={this.handleClosePreview.bind(this)}
							/>
							: <DataObjectsTable
								tabHeader="Advanced"
								previewAction={this.handlePreview.bind(this)}
								hasFilters={hasFilters}
								{...copyprops(props, [
									'objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging', 'preview',
									'cart', 'addToCart', 'removeFromCart', 'lookup'
								])}/>
						}
						{props.preview.visible
							? <Preview
								tabHeader="Simple"
								preview={props.preview}
								setPreviewUrl={props.setPreviewUrl}
								closePreviewAction={this.handleClosePreview.bind(this)}
							/>
							: <SimpleDataObjectsTable
								tabHeader="Simple"
							/>
						}
					</Tabs>
				</div>
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {
		queryMeta: (id, search) => dispatch(queryMeta(id, search)),
		updateFilter: (varName, values) => dispatch(specFilterUpdate(varName, values)),
		toggleSort: varName => dispatch(toggleSort(varName)),
		requestStep: direction => dispatch(requestStep(direction)),
		setPreviewItem: id => dispatch(setPreviewItem(id)),
		setPreviewVisibility: visibility => dispatch(setPreviewVisibility(visibility)),
		addToCart: objInfo => dispatch(addToCart(objInfo)),
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		specFiltersReset: () => dispatch(specFiltersReset),
		updateSelectedPids: pids => dispatch(updateSelectedPids(pids)),
	};
}

export default connect(state => state, dispatchToProps)(Search);