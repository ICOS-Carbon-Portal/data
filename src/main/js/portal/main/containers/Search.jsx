import React, { Component } from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import Filters from '../components/filters/Filters.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import CompactSearchResultTable from '../components/searchResult/CompactSearchResultTable.jsx';
import SearchResultTable from '../components/searchResult/SearchResultTable.jsx';
import {queryMeta, specFilterUpdate, toggleSort, requestStep, removeFromCart} from '../actions';
import {setPreviewUrl, setPreviewItem, specFiltersReset, updateSelectedPids, updateCheckedObjectsInSearch} from '../actions';
import HelpSection from "../components/help/HelpSection.jsx";
import {debounce, Events} from 'icos-cp-utils';
import {isSmallDevice} from '../utils';

class Search extends Component {
	constructor(props) {
		super(props);
		this.state = {expandedFilters: !isSmallDevice()};

		this.events = new Events();
		this.handleResize = debounce(_ => {
			const expandedFilters = this.state.expandedFilters;
			const expanded = isSmallDevice()
				? expandedFilters
				: true;
			this.setState({expandedFilters: expanded});
		});
		this.events.addToTarget(window, "resize", this.handleResize);
	}

	handlePreview(ids){
		if (this.props.setPreviewItem) this.props.setPreviewItem(ids);
	}

	handleAddToCart(objInfo) {
		this.props.addToCart(objInfo);
		this.props.updateCheckedObjects([]);
	}

	handleAllCheckboxesChange() {
		if (this.props.checkedObjectsInSearch.length > 0) {
			this.props.updateCheckedObjects([]);
		} else {
			const checkedObjects = this.props.objectsTable.reduce((acc, o) => {
				if (o.level > 0) acc.push(o.dobj);
				return acc;
			}, []);
			this.props.updateCheckedObjects(checkedObjects);
		}
	}

	handleViewMetadata(id) {
		if (this.props.setMetadataItem) this.props.setMetadataItem(id);
	}

	toggleFilters() {
		this.setState({expandedFilters: !this.state.expandedFilters});
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const props = this.props;
		const tabs = props.tabs;
		const searchProps = copyprops(props, ['specTable', 'updateFilter', 'specFiltersReset', 'switchTab',
			'filterTemporal', 'setFilterTemporal', 'queryMeta', 'filterFreeText', 'updateSelectedPids',
			'helpStorage', 'getResourceHelpInfo']);
		const expandedFilters = this.state.expandedFilters ? {} : {height: 0, overflow: 'hidden'};
		const filterIconClass = this.state.expandedFilters ? "glyphicon glyphicon-menu-up pull-right" : "glyphicon glyphicon-menu-down pull-right";

		return (
			<div className="row" style={{position:'relative'}}>
				<div style={{position:'absolute',top:-20,right:15,bottom:0}}>
					<div style={{position:'sticky',top:2,padding:0,zIndex:9999}}>
						<HelpSection
							width={300}
							helpStorage={searchProps.helpStorage}
							getResourceHelpInfo={searchProps.getResourceHelpInfo}
						/>
					</div>
				</div>
				<div className="col-sm-4 col-md-3" style={{marginBottom: 20}}>
					<button className="btn btn-default btn-block visible-xs-block" type="button" onClick={this.toggleFilters.bind(this)} style={{marginBottom: 10}}>
						Filters<span className={filterIconClass} aria-hidden="true" style={{marginTop: 2}}></span>
					</button>
					<div style={expandedFilters}>
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
				</div>
				<div className="col-sm-8 col-md-9">
					<Tabs tabName="resultTab" selectedTabId={tabs.resultTab} switchTab={props.switchTab}>
						<SearchResultTable
							tabHeader="Search results"
							viewMetadata={this.handleViewMetadata.bind(this)}
							previewAction={this.handlePreview.bind(this)}
							updateCheckedObjects={props.updateCheckedObjects.bind(this)}
							handleAddToCart={this.handleAddToCart.bind(this)}
							handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
							{...copyprops(props, [
								'objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging', 'preview',
								'cart', 'addToCart', 'removeFromCart', 'lookup', 'extendedDobjInfo', 'checkedObjectsInSearch',
								'helpStorage', 'getResourceHelpInfo'
							])}
						/>
						<CompactSearchResultTable
							tabHeader="Compact view"
							viewMetadata={this.handleViewMetadata.bind(this)}
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
		removeFromCart: id => dispatch(removeFromCart(id)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		specFiltersReset: () => dispatch(specFiltersReset),
		updateSelectedPids: pids => dispatch(updateSelectedPids(pids)),
		updateCheckedObjects: ids => dispatch(updateCheckedObjectsInSearch(ids)),
	};
}

export default connect(state => state.toPlainObject, dispatchToProps)(Search);
