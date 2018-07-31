import React, { Component } from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import Filters from '../components/filters/Filters.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import CompactSearchResultTable from '../components/searchResult/CompactSearchResultTable.jsx';
import SearchResultTable from '../components/searchResult/SearchResultTable.jsx';
import Preview from '../components/preview/Preview.jsx';
import {queryMeta, specFilterUpdate, toggleSort, requestStep, addToCart, removeFromCart} from '../actions';
import {setPreviewUrl, setPreviewItem, specFiltersReset, updateSelectedPids, updateCheckedObjects} from '../actions';

class Search extends Component {
	constructor(props) {
		super(props);
	}

	handlePreview(ids){
		if (this.props.setPreviewItem) this.props.setPreviewItem(ids);
	}

	render(){
		const props = this.props;
		const tabs = props.routeAndParams.tabs;
		const searchProps = copyprops(props, ['specTable', 'updateFilter', 'specFiltersReset', 'switchTab',
			'filterTemporal', 'setFilterTemporal', 'queryMeta', 'filterFreeText', 'updateSelectedPids']);

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
						<SearchResultTable
							tabHeader="Search results"
							previewAction={this.handlePreview.bind(this)}
							{...copyprops(props, [
								'objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging', 'preview',
								'cart', 'addToCart', 'removeFromCart', 'lookup', 'extendedDobjInfo', 'updateCheckboxes', 'checkedObjects', 'handleCheckboxChange'
							])}
						/>
						<CompactSearchResultTable
							tabHeader="Compact view"
							previewAction={this.handlePreview.bind(this)}
							{...copyprops(props, [
								'objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging', 'preview',
								'cart', 'addToCart', 'removeFromCart', 'lookup'
							])}
						/>
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
		addToCart: objInfo => dispatch(addToCart(objInfo)),
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		specFiltersReset: () => dispatch(specFiltersReset),
		updateSelectedPids: pids => dispatch(updateSelectedPids(pids)),
		updateCheckboxes: ids => dispatch(updateCheckedObjects(ids)),
	};
}

export default connect(state => state, dispatchToProps)(Search);
