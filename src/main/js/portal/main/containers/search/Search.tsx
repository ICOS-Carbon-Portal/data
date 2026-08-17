import React, {Component, ReactNode} from 'react';
import { connect } from 'react-redux';
import { Modal } from 'react-bootstrap';
import {debounce, Events} from 'icos-cp-utils';
import Tabs from '../../components/ui/Tabs';
import SearchResultRegular from './SearchResultRegular';
import {updateCheckedObjectsInSearch, switchTab, filtersReset, setMapProps, requestStep, getAllFilteredDataObjects} from '../../actions/search';
import {Paging} from '../../components/buttons/Paging';
import ActiveFilters from './ActiveFilters';
import {getLastSegmentsInUrls, isSmallDevice} from '../../utils';
import {Sha256Str, UrlStr} from "../../backend/declarations";
import {PortalDispatch} from "../../store";
import {Route, State} from "../../models/State";
import {addToCart, updateRoute} from "../../actions/common";
import Filters from "./Filters";
import SearchResultCompact from "./SearchResultCompact";
import Advanced from "./Advanced";
import StationsMap from './StationsMap';
import {StationsMapCtrl} from '../../components/filters/StationsMapCtrl';
import {ResultViewSwitch} from '../../components/searchResult/ResultViewSwitch';
import { EpsgCode, getViewParams, SupportedSRIDs } from 'icos-cp-ol';
import config from '../../config';
import { PersistedMapPropsExtended } from '../../models/InitMap';
import { getPersistedMapProps } from '../../backend';
import { addingToCartProhibition } from '../../models/CartItem';

const defaultViewTabId = 0;
const compactViewTabId = 1;

// The preview map must not persist anything: its viewport is far smaller than
// the modal's, so the center and zoom it fits to are not the ones the full map
// should open with. Its own controls are hidden, so nothing else can fire.
function ignoreMapProps() {}

// The preview fits the whole extent of its projection, and the map is centered
// in whichever direction is left over, so a frame shaped like anything other
// than that extent just pads the map out with slack. The extents differ wildly
// between projections: LAEA Europe is square, World Robinson is 2:1.
function previewAspectRatio(srid: SupportedSRIDs | undefined) {
	const epsgCode = `EPSG:${srid ?? config.olMapSettings.defaultSRID}` as EpsgCode;
	const [minX, minY, maxX, maxY] = getViewParams(epsgCode).extent;

	return (maxX - minX) / (maxY - minY);
}

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & { HelpSection: ReactNode };
type OurState = {
	expandedFilters: boolean
	srid?: SupportedSRIDs
	isStationsMapOpen: boolean
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
			isStationsMapOpen: false
		};
	}

	setCompactView(isCompact: boolean) {
		this.props.switchTab('resultTab', isCompact ? compactViewTabId : defaultViewTabId);
	}

	openStationsMap() {
		this.setState({isStationsMapOpen: true});
	}

	closeStationsMap() {
		this.setState({isStationsMapOpen: false});
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

	handleRemoveMapRect() {
		this.persistedMapProps = {...this.persistedMapProps, drawFeatures: []};
		this.props.setMapProps(this.persistedMapProps);
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
		// Using srid as key for StationsMap forces React to recreate the component when it changes
		this.setState({ srid });
	}

	toggleFilters() {
		this.setState({expandedFilters: !this.state.expandedFilters});
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const { HelpSection, tabs, switchTab, paging, searchOptions, exportQuery,
			requestStep, getAllFilteredDataObjects } = this.props;
		const { srid } = this.state;
		const expandedFilters = this.state.expandedFilters ? {} : {height: 0, overflow: 'hidden'};
		const filterIconClass = this.state.expandedFilters ? "fas fa-angle-up float-end" : "fas fa-angle-down float-end";

		const isCompact = tabs.resultTab === compactViewTabId;

		// The preview fits the whole extent instead of following the full map: the
		// center and zoom the modal persists are for a far larger viewport
		const {center, zoom, ...previewMapProps} = this.persistedMapProps;

		const mapPreview = <StationsMap
			key={srid}
			isPreview={true}
			persistedMapProps={previewMapProps}
			updatePersistedMapProps={ignoreMapProps}
			updateMapSelectedSRID={ignoreMapProps}
		/>;

		const stationsMapCtrl = <StationsMapCtrl
			openStationsMap={this.openStationsMap.bind(this)}
			mapPreview={mapPreview}
			aspectRatio={previewAspectRatio(srid)}
		/>;

		const resultsView = isCompact
			? <SearchResultCompact
				handlePreview={this.handlePreview.bind(this)}
			/>
			: <SearchResultRegular
				handlePreview={this.handlePreview.bind(this)}
				handleAddToCart={this.handleAddToCart.bind(this)}
				handleAllCheckboxesChange={this.handleAllCheckboxesChange.bind(this)}
			/>;

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
							<Filters tabHeader="Filters" stationsMapCtrl={stationsMapCtrl} />
							<Advanced tabHeader="Advanced" />
						</Tabs>
					</div>

				</div>

				<div className="col-sm-8 col-md-9">
					<div className="card">
						<div className="card-header d-flex justify-content-between align-items-center">
							Search results

							<ResultViewSwitch isCompact={isCompact} setCompact={this.setCompactView.bind(this)} />
						</div>

						<ActiveFilters
							removeMapRect={this.handleRemoveMapRect.bind(this)}
							clearAllFilters={this.handleFilterReset.bind(this)}
						/>

						<Paging
							searchOptions={searchOptions}
							type="header"
							paging={paging}
							requestStep={requestStep}
							getAllFilteredDataObjects={getAllFilteredDataObjects}
							exportQuery={exportQuery}
						/>

						{resultsView}
					</div>
				</div>

				<Modal
					show={this.state.isStationsMapOpen}
					onHide={this.closeStationsMap.bind(this)}
					size="xl"
					centered
					backdrop={true}
					keyboard={true}
				>
					<Modal.Header closeButton>
						<Modal.Title>Stations map</Modal.Title>
					</Modal.Header>
					<Modal.Body className="p-0" style={{overflow: 'hidden'}}>
						<StationsMap
							key={srid}
							persistedMapProps={this.persistedMapProps}
							updatePersistedMapProps={this.updatePersistedMapProps.bind(this)}
							updateMapSelectedSRID={this.updateMapSelectedSRID.bind(this)}
						/>
					</Modal.Body>
				</Modal>
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		objectsTable: state.objectsTable,
		tabs: state.tabs,
		paging: state.paging,
		searchOptions: state.searchOptions,
		exportQuery: state.exportQuery
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateRoute: (route: Route, previewPids: Sha256Str[]) => dispatch(updateRoute(route, previewPids)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		updateCheckedObjects: (ids: UrlStr[] | UrlStr) => dispatch(updateCheckedObjectsInSearch(ids)),
		switchTab: (tabName: string, selectedTabId: number) => dispatch(switchTab(tabName, selectedTabId)),
		setMapProps: (mapProps: PersistedMapPropsExtended) => dispatch(setMapProps(mapProps)),
		filtersReset: () => dispatch(filtersReset),
		requestStep: (direction: -1 | 1) => dispatch(requestStep(direction)),
		getAllFilteredDataObjects: () => dispatch(getAllFilteredDataObjects())
	};
}

export default connect(stateToProps, dispatchToProps)(Search);
