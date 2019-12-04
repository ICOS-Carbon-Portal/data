import React, {Component} from 'react';
import { connect } from 'react-redux';
import {debounce, Events} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter';
import Tabs from '../components/ui/Tabs';
import CompactSearchResultTable from '../components/searchResult/CompactSearchResultTable';
import SearchResultTable from '../components/searchResult/SearchResultTable';
import {
	queryMeta,
	specFilterUpdate,
	toggleSort,
	requestStep,
	removeFromCart,
	setPreviewUrl,
	setPreviewItem,
	filtersReset,
	updateSelectedPids,
	updateCheckedObjectsInSearch,
	switchTab,
	setFilterTemporal,
	addToCart, getResourceHelpInfo, setMetadataItem, updateSearchOption, SearchOption
} from '../actions';
import HelpSection from "../components/help/HelpSection";
import {isSmallDevice, pick} from '../utils';
import {PickClassFunctions, Sha256Str, UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import {State} from "../models/State";
import {Item} from "../models/HelpStorage";
import AdvancedSettings from "../components/AdvancedSettings";
import {ColNames} from "../models/CompositeSpecTable";
import {Value} from "../models/SpecTable";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurState = {expandedFilters: boolean};
type SearchProps = StateProps & DispatchProps;

const reducedProps = (props: SearchProps) => ({
	helpSection: pick(props,'helpStorage', 'getResourceHelpInfo'),
	objSpecFilter: pick(props,'specTable', 'updateFilter', 'filtersReset', 'switchTab',
		'filterTemporal', 'setFilterTemporal', 'queryMeta', 'filterFreeText',
		'helpStorage', 'getResourceHelpInfo', 'filterTemporal'),
	searchResultTable: pick(props, 'objectsTable', 'toggleSort', 'sorting', 'requestStep',
		'paging', 'preview', 'cart', 'addToCart', 'removeFromCart', 'lookup', 'extendedDobjInfo',
		'checkedObjectsInSearch', 'helpStorage', 'getResourceHelpInfo', 'updateCheckedObjects'),
	compactSearchResultTable: pick(props, 'objectsTable', 'toggleSort', 'sorting',
		'requestStep', 'paging', 'preview', 'cart', 'addToCart', 'removeFromCart', 'lookup'),
	advanced: pick(props, 'queryMeta', 'filterFreeText', 'updateSelectedPids', 'searchOptions', 'updateSearchOption')
});

export type SearchActions = PickClassFunctions<typeof Search>;
export type ReducedProps = ReturnType<typeof reducedProps>;

class Search extends Component<SearchProps, OurState> {
	private events: typeof Events;
	private handleResize: Function;

	constructor(props: SearchProps) {
		super(props);
		this.state = {expandedFilters: !isSmallDevice()};

		this.events = new Events();
		this.handleResize = debounce(() => {
			const expandedFilters = this.state.expandedFilters;
			const expanded = isSmallDevice()
				? expandedFilters
				: true;
			this.setState({expandedFilters: expanded});
		});
		this.events.addToTarget(window, "resize", this.handleResize);
	}

	handlePreview(ids: UrlStr[]){
		if (this.props.setPreviewItem) this.props.setPreviewItem(ids);
	}

	handleAddToCart(objInfo: UrlStr[]) {
		this.props.addToCart(objInfo);
		this.props.updateCheckedObjects([]);
	}

	handleAllCheckboxesChange() {
		if (this.props.checkedObjectsInSearch.length > 0) {
			this.props.updateCheckedObjects([]);
		} else {
			const checkedObjects = this.props.objectsTable.reduce((acc: any, o) => {
				if (o.level > 0) acc.push(o.dobj);
				return acc;
			}, []);
			this.props.updateCheckedObjects(checkedObjects);
		}
	}

	handleViewMetadata(id: UrlStr) {
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
		const {helpSection, objSpecFilter, searchResultTable, compactSearchResultTable, advanced} = reducedProps(this.props);
		const expandedFilters = this.state.expandedFilters ? {} : {height: 0, overflow: 'hidden'};
		const filterIconClass = this.state.expandedFilters ? "glyphicon glyphicon-menu-up pull-right" : "glyphicon glyphicon-menu-down pull-right";

		return (
			<div className="row" style={{position:'relative'}}>
				<div style={{position:'absolute',top:-20,right:15,bottom:0}}>
					<div style={{position:'sticky',top:2,padding:0,zIndex:9999}}>
						<HelpSection
							width={300}
							{...helpSection}
						/>
					</div>
				</div>
				<div className="col-sm-4 col-md-3" style={{marginBottom: 20}}>
					<button className="btn btn-default btn-block visible-xs-block" type="button" onClick={this.toggleFilters.bind(this)} style={{marginBottom: 10}}>
						Filters<span className={filterIconClass} aria-hidden="true" style={{marginTop: 2}} />
					</button>
					<div style={expandedFilters}>
						<Tabs tabName="searchTab" selectedTabId={tabs.searchTab} switchTab={props.switchTab}>
							<ObjSpecFilter tabHeader="Filters" {...objSpecFilter} />
							<AdvancedSettings tabHeader="Advanced" {...advanced} />
						</Tabs>
					</div>
				</div>
				<div className="col-sm-8 col-md-9">
					<Tabs tabName="resultTab" selectedTabId={tabs.resultTab} switchTab={props.switchTab}>
						<SearchResultTable
							tabHeader="Search results"
							handleViewMetadata={this.handleViewMetadata.bind(this)}
							handlePreview={this.handlePreview.bind(this)}
							handleAddToCart={this.handleAddToCart.bind(this)}
							handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
							{...searchResultTable}
						/>
						<CompactSearchResultTable
							tabHeader="Compact view"
							viewMetadata={this.handleViewMetadata.bind(this)}
							previewAction={this.handlePreview.bind(this)}
							{...compactSearchResultTable}
						/>
					</Tabs>
				</div>
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		cart: state.cart,
		lookup: state.lookup,
		preview: state.preview,
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		extendedDobjInfo: state.extendedDobjInfo,
		tabs: state.tabs,
		helpStorage: state.helpStorage,
		objectsTable: state.objectsTable,
		filterTemporal: state.filterTemporal,
		filterFreeText: state.filterFreeText,
		specTable: state.specTable,
		paging: state.paging,
		sorting: state.sorting,
		searchOptions: state.searchOptions,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		queryMeta: (id: string, search: string) => dispatch(queryMeta(id, search)),
		updateFilter: (varName: ColNames, values: Value[]) => dispatch(specFilterUpdate(varName, values)),
		toggleSort: (varName: string) => dispatch(toggleSort(varName)),
		requestStep: (direction: -1 | 1) => dispatch(requestStep(direction)),
		setPreviewItem: (ids: UrlStr[]) => dispatch(setPreviewItem(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		setPreviewUrl: (url: UrlStr) => dispatch(setPreviewUrl(url)),
		filtersReset: () => dispatch(filtersReset),
		updateSelectedPids: (pids: Sha256Str[]) => dispatch(updateSelectedPids(pids)),
		updateCheckedObjects: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInSearch(ids)),
		switchTab: (tabName: string, selectedTabId: string) => dispatch(switchTab(tabName, selectedTabId)),
		setFilterTemporal: (filterTemporal: any) => dispatch(setFilterTemporal(filterTemporal)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		getResourceHelpInfo: (helpItem: Item) => dispatch(getResourceHelpInfo(helpItem)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		updateSearchOption: (searchOption: SearchOption) => dispatch(updateSearchOption(searchOption)),
	};
}

export default connect(stateToProps, dispatchToProps)(Search);
