import React, {Component} from 'react';
import { connect } from 'react-redux';
import {debounce, Events} from 'icos-cp-utils';
import Tabs from '../../components/ui/Tabs';
import SearchResultRegular from './SearchResultRegular';
import {updateCheckedObjectsInSearch, switchTab} from '../../actions/search';
import Help from "../help/Help";
import {getLastSegmentsInUrls, isSmallDevice, pick} from '../../utils';
import {Sha256Str, UrlStr} from "../../backend/declarations";
import {PortalDispatch} from "../../store";
import {Route, State} from "../../models/State";
import {addToCart, setMetadataItem, updateRoute} from "../../actions/common";
import Filters from "./Filters";
import SearchResultCompact from "./SearchResultCompact";
import Advanced from "./Advanced";

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps;
type OurState = {expandedFilters: boolean};


class Search extends Component<OurProps, OurState> {
	private events: typeof Events;
	private handleResize: Function;

	constructor(props: OurProps) {
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

	handlePreview(urls: UrlStr[]){
		this.props.updateRoute('preview', getLastSegmentsInUrls(urls));
	}

	handleAddToCart(objInfo: UrlStr[]) {
		this.props.addToCart(objInfo);
		this.props.updateCheckedObjects([]);
	}

	handleAllCheckboxesChange() {
		if (this.props.checkedObjectsInSearch.length > 0) {
			this.props.updateCheckedObjects([]);
		} else {
			const checkedObjects = this.props.objectsTable.reduce((acc: string[], o) => {
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
		const {tabs, switchTab} = this.props;
		const expandedFilters = this.state.expandedFilters ? {} : {height: 0, overflow: 'hidden'};
		const filterIconClass = this.state.expandedFilters ? "glyphicon glyphicon-menu-up pull-right" : "glyphicon glyphicon-menu-down pull-right";

		return (
			<div className="row" style={{position:'relative'}}>
				<div style={{position:'absolute',top:-20,right:15,bottom:0}}>
					<div style={{position:'sticky',top:2,padding:0,zIndex:9999}}>
						<Help />
					</div>
				</div>
				<div className="col-sm-4 col-md-3" style={{marginBottom: 20}}>

					<button className="btn btn-default btn-block visible-xs-block" type="button" onClick={this.toggleFilters.bind(this)} style={{marginBottom: 10}}>
						Filters<span className={filterIconClass} aria-hidden="true" style={{marginTop: 2}} />
					</button>

					<div style={expandedFilters}>
						<Tabs tabName="searchTab" selectedTabId={tabs.searchTab} switchTab={switchTab}>
							<Filters tabHeader="Filters" />
							<Advanced tabHeader="Advanced" />
						</Tabs>
					</div>

				</div>

				<div className="col-sm-8 col-md-9">
					<Tabs tabName="resultTab" selectedTabId={tabs.resultTab} switchTab={switchTab}>
						<SearchResultRegular
							tabHeader="Search results"
							handleViewMetadata={this.handleViewMetadata.bind(this)}
							handlePreview={this.handlePreview.bind(this)}
							handleAddToCart={this.handleAddToCart.bind(this)}
							handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
						/>
						<SearchResultCompact
							tabHeader="Compact view"
							handleViewMetadata={this.handleViewMetadata.bind(this)}
							handlePreview={this.handlePreview.bind(this)}
						/>
					</Tabs>
				</div>
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		objectsTable: state.objectsTable,
		tabs: state.tabs,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		updateRoute: (route: Route, previewPids: Sha256Str[]) => dispatch(updateRoute(route, previewPids)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		updateCheckedObjects: (ids: UrlStr[] | UrlStr) => dispatch(updateCheckedObjectsInSearch(ids)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		switchTab: (tabName: string, selectedTabId: string) => dispatch(switchTab(tabName, selectedTabId))
	};
}

export default connect(stateToProps, dispatchToProps)(Search);
