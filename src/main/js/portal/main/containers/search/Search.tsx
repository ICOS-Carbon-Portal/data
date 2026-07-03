import React, {Component, ReactNode} from 'react';
import { connect } from 'react-redux';
import {debounce, Events} from 'icos-cp-utils';
import Tabs from '../../components/ui/Tabs';
import SearchResultRegular from './SearchResultRegular';
import {updateCheckedObjectsInSearch, switchTab, filtersReset, setMapProps} from '../../actions/search';
import {getLastSegmentsInUrls, isSmallDevice} from '../../utils';
import {Sha256Str, UrlStr} from "../../backend/declarations";
import {PortalDispatch} from "../../store";
import {Route, State} from "../../models/State";
import {addToCart, updateRoute} from "../../actions/common";
import Filters from "./Filters";
import SearchResultCompact from "./SearchResultCompact";
import Advanced from "./Advanced";
import SearchResultMap from './SearchResultMap';
import { SupportedSRIDs } from 'icos-cp-ol';
import config from '../../config';
import { PersistedMapPropsExtended } from '../../models/InitMap';
import { getPersistedMapProps } from '../../backend';
import { addingToCartProhibition } from '../../models/CartItem';

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & { HelpSection: ReactNode };
type OurState = {
	expandedFilters: boolean
	srid?: SupportedSRIDs
	// dual-view only: restrict each pane to data objects (by hash) absent from the other pane
	showUniqueOnly: boolean
};

class Search extends Component<OurProps, OurState> {
	private events: typeof Events;
	private handleResize: Function;
	private persistedMapProps: PersistedMapPropsExtended;

	constructor(props: OurProps) {
		super(props);

		this.events = new Events();
		this.handleResize = debounce(() => {
			const expandedFilters = this.state.expandedFilters;
			const expanded = isSmallDevice()
				? expandedFilters
				: true;
			this.setState({expandedFilters: expanded});
		});
		this.events.addToTarget(window, "resize", this.handleResize);

		this.persistedMapProps = getPersistedMapProps() ?? {
			baseMap: config.olMapSettings.defaultBaseMap,
			srid: config.olMapSettings.defaultSRID
		};

		this.state = {
			expandedFilters: !isSmallDevice(),
			srid: this.persistedMapProps.srid,
			showUniqueOnly: false
		};
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
			const checkedObjects = this.props.objectsTable
				.filter(o => addingToCartProhibition(o).allowCartAdd)
				.map(o => o.dobj);
			this.props.updateCheckedObjects(checkedObjects);
		}
	}

	handleFilterReset() {
		delete this.persistedMapProps.drawFeatures;
		this.props.filtersReset();
	}

	updatePersistedMapProps(persistedMapProps: PersistedMapPropsExtended) {
		this.persistedMapProps = { ...this.persistedMapProps, ...persistedMapProps };
		this.props.setMapProps(this.persistedMapProps);
	}

	updateMapSelectedSRID(srid: SupportedSRIDs) {
		const { isStationFilterCtrlActive, baseMap, visibleToggles } = this.persistedMapProps;
		this.persistedMapProps = { 
			isStationFilterCtrlActive,
			baseMap,
			visibleToggles,
			srid
		};
		// Using srid as key for SearchResultMap forces React to recreate the component when it changes
		this.setState({ srid });
	}

	toggleFilters() {
		this.setState({expandedFilters: !this.state.expandedFilters});
	}

	toggleShowUniqueOnly() {
		this.setState({showUniqueOnly: !this.state.showUniqueOnly});
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const { HelpSection, tabs, switchTab } = this.props;
		const { srid } = this.state;
		const expandedFilters = this.state.expandedFilters ? {} : {height: 0, overflow: 'hidden'};
		const filterIconClass = this.state.expandedFilters ? "fas fa-angle-up float-end" : "fas fa-angle-down float-end";

		return (
			<div className="row" style={{ position: 'relative' }}>
				<div style={{ display:'inline-block' }}>
					{HelpSection}
				</div>

				<div className="col-sm-4 col-md-3" style={{ marginBottom: 20 }}>

					<button className="btn btn-outline-secondary w-100 d-block d-sm-none" type="button" onClick={this.toggleFilters.bind(this)} style={{marginBottom: 10}}>
						Filters<span className={filterIconClass} aria-hidden="true" style={{marginTop: 2}} />
					</button>

					<div style={expandedFilters}>
						<Tabs tabName="searchTab" selectedTabId={tabs.searchTab} switchTab={switchTab}>
							<Filters tabHeader="Filters" handleFilterReset={this.handleFilterReset.bind(this)} />
							<Advanced tabHeader="Advanced" />
						</Tabs>
					</div>

				</div>

				<div className="col-sm-8 col-md-9">
					{config.dualView ? (
						<div>
							<div className="d-flex justify-content-end mb-2">
								<button
									type="button"
									className={"btn btn-sm " + (this.state.showUniqueOnly ? "btn-secondary" : "btn-outline-secondary")}
									onClick={this.toggleShowUniqueOnly.bind(this)}
									title="Show only the data objects (compared by hash) that are present in one source but not in the other"
								>
									<i className="fas fa-not-equal" style={{ marginRight: 6 }} aria-hidden="true" />
									Unique entries only
								</button>
							</div>
							<div className="row">
								<div className="col-lg-6 mb-3">
									<EndpointLabel url={config.sparqlEndpoint} />
									<SearchResultRegular
										tabHeader="Search results"
										paneSource="primary"
										showUniqueOnly={this.state.showUniqueOnly}
										handlePreview={this.handlePreview.bind(this)}
										handleAddToCart={this.handleAddToCart.bind(this)}
										handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
									/>
								</div>
								<div className="col-lg-6 mb-3">
									<EndpointLabel url={config.secondarySparqlEndpoint ?? ''} />
									<SearchResultRegular
										tabHeader="Search results"
										paneSource="secondary"
										showUniqueOnly={this.state.showUniqueOnly}
										handlePreview={this.handlePreview.bind(this)}
										handleAddToCart={this.handleAddToCart.bind(this)}
										handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
									/>
								</div>
							</div>
						</div>
					) : (
						<Tabs tabName="resultTab" selectedTabId={tabs.resultTab} switchTab={switchTab}>
							<SearchResultRegular
								tabHeader="Search results"
								handlePreview={this.handlePreview.bind(this)}
								handleAddToCart={this.handleAddToCart.bind(this)}
								handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
							/>
							<SearchResultCompact
								tabHeader="Compact view"
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
					)}
				</div>
			</div>
		);
	}
}

const EndpointLabel = ({ url }: { url: string }) => (
	<div className="text-secondary small text-truncate mb-1" title={url} style={{ fontWeight: 600 }}>
		<i className="fas fa-database" style={{ marginRight: 6 }} aria-hidden="true" />
		{url}
	</div>
);

function stateToProps(state: State){
	return {
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		objectsTable: state.objectsTable,
		tabs: state.tabs
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateRoute: (route: Route, previewPids: Sha256Str[]) => dispatch(updateRoute(route, previewPids)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		updateCheckedObjects: (ids: UrlStr[] | UrlStr) => dispatch(updateCheckedObjectsInSearch(ids)),
		switchTab: (tabName: string, selectedTabId: number) => dispatch(switchTab(tabName, selectedTabId)),
		setMapProps: (mapProps: PersistedMapPropsExtended) => dispatch(setMapProps(mapProps)),
		filtersReset: () => dispatch(filtersReset)
	};
}

export default connect(stateToProps, dispatchToProps)(Search);
