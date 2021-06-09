import React, {Component, ReactNode} from 'react';
import { connect } from 'react-redux';
import {debounce, Events} from 'icos-cp-utils';
import Tabs from '../../components/ui/Tabs';
import SearchResultRegular from './SearchResultRegular';
import {updateCheckedObjectsInSearch, switchTab} from '../../actions/search';
import {getLastSegmentsInUrls, isSmallDevice} from '../../utils';
import {Sha256Str, UrlStr} from "../../backend/declarations";
import {PortalDispatch} from "../../store";
import {Route, State} from "../../models/State";
import {addToCart, updateRoute} from "../../actions/common";
import Filters from "./Filters";
import SearchResultCompact from "./SearchResultCompact";
import Advanced from "./Advanced";
import bootstrapMetadata from '../../actions/metadata';
import SearchResultMap from './SearchResultMap';
import { SupportedSRIDs } from '../../models/ol/projections';
import config from '../../config';
import { PersistedMapProps } from '../../models/ol/OLWrapper';

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & { HelpSection: ReactNode };
type OurState = {
	expandedFilters: boolean
	srid?: SupportedSRIDs
};

class Search extends Component<OurProps, OurState> {
	private events: typeof Events;
	private handleResize: Function;
	private persistedMapProps: PersistedMapProps = {
		baseMapName: config.olMapSettings.defaultBaseMapName,
		srid: config.olMapSettings.defaultSRID
	};

	constructor(props: OurProps) {
		super(props);
		this.state = {
			expandedFilters: !isSmallDevice(),
			srid: this.persistedMapProps.srid
		};

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
		this.props.bootstrapMetadata(id);
	}

	updatePersistedMapProps(mapProps: PersistedMapProps) {
		this.persistedMapProps = { ...this.persistedMapProps, ...mapProps };
	}

	updateMapSelectedSRID(srid: SupportedSRIDs) {
		this.persistedMapProps = { ...this.persistedMapProps, srid };
		// Using srid as key for SearchResultMap forces React to recreate the component when it changes
		this.setState({ srid });
	}

	toggleFilters() {
		this.setState({expandedFilters: !this.state.expandedFilters});
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const { HelpSection, tabs, switchTab } = this.props;
		const { srid } = this.state;
		const expandedFilters = this.state.expandedFilters ? {} : {height: 0, overflow: 'hidden'};
		const filterIconClass = this.state.expandedFilters ? "glyphicon glyphicon-menu-up pull-right" : "glyphicon glyphicon-menu-down pull-right";

		return (
			<div className="row" style={{ position: 'relative' }}>
				{HelpSection}

				<div className="col-sm-4 col-md-3" style={{ marginBottom: 20 }}>

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
						<SearchResultMap
							key={srid}
							tabHeader="Stations map"
							persistedMapProps={this.persistedMapProps}
							updatePersistedMapProps={this.updatePersistedMapProps.bind(this)}
							updateMapSelectedSRID={this.updateMapSelectedSRID.bind(this)}
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
		tabs: state.tabs
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		updateRoute: (route: Route, previewPids: Sha256Str[]) => dispatch(updateRoute(route, previewPids)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		updateCheckedObjects: (ids: UrlStr[] | UrlStr) => dispatch(updateCheckedObjectsInSearch(ids)),
		bootstrapMetadata: (id: UrlStr) => dispatch(bootstrapMetadata(id)),
		switchTab: (tabName: string, selectedTabId: string) => dispatch(switchTab(tabName, selectedTabId))
	};
}

export default connect(stateToProps, dispatchToProps)(Search);
