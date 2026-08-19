import React, {Component, ReactNode} from 'react';
import { connect } from 'react-redux';
import { Modal } from 'react-bootstrap';
import {debounce, Events} from 'icos-cp-utils';
import Tabs from '../../components/ui/Tabs';
import SearchResultRegular from './SearchResultRegular';
import {updateCheckedObjectsInSearch, switchTab, filtersReset, setMapProps, requestStep, getAllFilteredDataObjects} from '../../actions/search';
import {PagingCount, PagingSteps} from '../../components/buttons/Paging';
import ActiveFilters from './ActiveFilters';
import {getLastSegmentsInUrls, isSmallDevice} from '../../utils';
import {Sha256Str, UrlStr} from "../../backend/declarations";
import {PortalDispatch} from "../../store";
import {DrawRectBbox, Route, State} from "../../models/State";
import {addToCart, updateRoute} from "../../actions/common";
import Filters from "./Filters";
import SearchResultCompact from "./SearchResultCompact";
import Advanced from "./Advanced";
import StationsMap from './StationsMap';
import {StationsMapPreview} from './StationsMapPreview';
import {StationsMapCtrl} from '../../components/filters/StationsMapCtrl';
import {ResultViewSwitch} from '../../components/searchResult/ResultViewSwitch';
import { BaseMapId, SupportedSRIDs } from 'icos-cp-ol';
import config from '../../config';
import { PersistedMapPropsExtended } from '../../models/InitMap';
import { rectsToDrawFeatures } from '../../models/MapProps';
import deepEqual from 'deep-equal';
import { getPersistedMapProps } from '../../backend';
import { addingToCartProhibition } from '../../models/CartItem';

const defaultViewTabId = 0;
const compactViewTabId = 1;

function mainElement() {
	return document.querySelector<HTMLElement>('main');
}

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & { HelpSection: ReactNode };
type OurState = {
	expandedFilters: boolean
	srid?: SupportedSRIDs
	baseMap?: BaseMapId
	isStationsMapOpen: boolean
	isMapFilterReset: boolean
};

class Search extends Component<OurProps, OurState> {
	private events: typeof Events;
	private handleResize: Function;
	private persistedMapProps: PersistedMapPropsExtended;
	private mapRectsSnapshot?: DrawRectBbox[];

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
			baseMap: this.persistedMapProps.baseMap,
			isStationsMapOpen: false,
			isMapFilterReset: false
		};
	}

	setCompactView(isCompact: boolean) {
		this.props.switchTab('resultTab', isCompact ? compactViewTabId : defaultViewTabId);
	}

	openStationsMap() {
		this.mapRectsSnapshot = this.props.spatialRects;
		this.setState({isStationsMapOpen: true, isMapFilterReset: false});
	}

	applyStationsMap() {
		this.mapRectsSnapshot = undefined;
		this.setState({isStationsMapOpen: false, isMapFilterReset: false});
	}

	cancelStationsMap() {
		const snapshot = this.mapRectsSnapshot;
		this.mapRectsSnapshot = undefined;
		this.setState({isStationsMapOpen: false, isMapFilterReset: false});

		if (snapshot === undefined) return;

		this.updatePersistedMapProps({drawFeatures: rectsToDrawFeatures(snapshot)});
	}

	resetStationsMap() {
		this.setState({isMapFilterReset: true});
		this.clearMapRects();
	}

	private mapFilterChangedInMap(): boolean {
		if (this.mapRectsSnapshot === undefined) return false;

		// A reset is a change to be applied even when it happens to leave the rectangles as
		// the map was opened with, such as after drawing one and then resetting
		return this.state.isMapFilterReset
			|| !deepEqual(this.props.spatialRects, this.mapRectsSnapshot);
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

	clearMapRects() {
		this.updatePersistedMapProps({drawFeatures: []});
	}

	updatePersistedMapProps(persistedMapProps: PersistedMapPropsExtended) {
		this.persistedMapProps = { ...this.persistedMapProps, ...persistedMapProps };
		this.props.setMapProps(this.persistedMapProps);

		const baseMap = this.persistedMapProps.baseMap;
		if (baseMap !== this.state.baseMap)
			this.setState({ baseMap });
	}

	updateMapSelectedSRID(srid: SupportedSRIDs) {
		const { isStationFilterCtrlActive, baseMap, visibleToggles } = this.persistedMapProps;
		this.updatePersistedMapProps({
			isStationFilterCtrlActive,
			baseMap,
			visibleToggles,
			srid,
			center: undefined,
			zoom: undefined,
			drawFeatures: []
		});

		this.mapRectsSnapshot = this.state.isStationsMapOpen ? [] : undefined;
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

		const previewMapProps = {
			...this.persistedMapProps,
			baseMap: this.state.baseMap,
			visibleToggles: undefined,
			center: undefined,
			zoom: undefined
		};

		const stationsMapCtrl = <StationsMapCtrl
			openStationsMap={this.openStationsMap.bind(this)}
			mapPreview={<StationsMapPreview previewMapProps={previewMapProps} />}
			srid={srid}
		/>;

		const stationsMapButtons = <div className="d-flex gap-2">
			<button
				type="button"
				className="btn btn-primary"
				disabled={!this.mapFilterChangedInMap()}
				onClick={this.applyStationsMap.bind(this)}
			>
				Apply
			</button>
			<button
				type="button"
				className="btn btn-secondary"
				disabled={this.props.spatialRects.length === 0}
				onClick={this.resetStationsMap.bind(this)}
			>
				Reset
			</button>
			<button type="button" className="btn btn-outline-secondary" onClick={this.cancelStationsMap.bind(this)}>
				Cancel
			</button>
		</div>;

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
						<div className="card-header aligned-card-header d-flex justify-content-between align-items-center gap-3">
							<PagingCount
								paging={paging}
								searchOptions={searchOptions}
								getAllFilteredDataObjects={getAllFilteredDataObjects}
								exportQuery={exportQuery}
							/>

							<div className="d-flex flex-wrap justify-content-end align-items-center column-gap-3 row-gap-1">
								<ResultViewSwitch isCompact={isCompact} setCompact={this.setCompactView.bind(this)} />

								<div className="lh-sm text-nowrap">
									<PagingSteps paging={paging} onStep={requestStep} />
								</div>
							</div>
						</div>

						<ActiveFilters
							removeMapRect={this.clearMapRects.bind(this)}
							clearAllFilters={this.handleFilterReset.bind(this)}
						/>

						{resultsView}
					</div>
				</div>

				<Modal
					show={this.state.isStationsMapOpen}
					onHide={this.applyStationsMap.bind(this)}
					container={mainElement}
					size="xl"
					centered
					backdrop={true}
					keyboard={true}
				>
					<Modal.Header>
						{/* Growing the title keeps the buttons at the far end of the header */}
						<Modal.Title className="flex-grow-1">Stations map</Modal.Title>

						{stationsMapButtons}
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
		exportQuery: state.exportQuery,
		spatialRects: state.mapProps.rects ?? []
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
