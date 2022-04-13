import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State } from "../../models/State";
import InitMap, { PersistedMapPropsExtended, UpdateMapSelectedSRID } from '../../models/InitMap';
import { PortalDispatch } from '../../store';
import { failWithError } from '../../actions/common';
import {spatialFilterUpdate} from '../../actions/search';
import {Filter} from '../../models/SpecTable';
import { Copyright } from 'icos-cp-copyright';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type incommingProps = {
	tabHeader: string
	persistedMapProps: PersistedMapPropsExtended
	updatePersistedMapProps: (mapProps: PersistedMapPropsExtended) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
}
type OurProps = StateProps & DispatchProps & incommingProps

class SearchResultMap extends Component<OurProps> {
	private initMap?: InitMap = undefined;

	constructor(props: OurProps) {
		super(props);
	}

	handleStationFilterUpdate(stationUrisToState: Filter){
		this.props.updateStationFilter(stationUrisToState);
	}

	componentDidUpdate(){
		if (this.initMap === undefined)
			return;

		this.initMap.incomingPropsUpdated({
			specTable: this.props.specTable,
			stationPos4326Lookup: this.props.stationPos4326Lookup,
			mapProps: this.props.mapProps,
			labelLookup: this.props.labelLookup,
			spatialStationsFilter: this.props.spatialStationsFilter
		});
	}

	render() {
		return (
			<div id="map" style={{ width: '100%', height: '90vh', position:'relative' }} tabIndex={1}>
				<div id="stationFilterCtrl" className="ol-control ol-layer-control-ur" style={{ top: 70, fontSize: 20 }}></div>
				<div id="popover" className="ol-popup"></div>
				<div id="projSwitchCtrl" className="ol-layer-control ol-layer-control-lr" style={{ zIndex: 99, marginRight: 10, padding: 0 }}></div>
				<div id="layerCtrl" className="ol-layer-control ol-layer-control-ur"></div>
				<div id="attribution" className="ol-attribution ol-unselectable ol-control ol-uncollapsible" style={{right: 15}}>
					<ul>
						<li>
							<Copyright />
						</li>
					</ul>
					<ul>
						<li id="baseMapAttribution" />
					</ul>
				</div>
			</div>
		);
	}

	componentDidMount() {
		(async () => {
			const { default: InitMap } = await import(
				/* webpackMode: "lazy" */
				/* webpackChunkName: "init-map" */
				'../../models/InitMap'
			);
			this.initMap = new InitMap({
				mapRootElement: document.getElementById('map')!,
				specTable: this.props.specTable,
				stationPos4326Lookup: this.props.stationPos4326Lookup,
				persistedMapProps: this.props.persistedMapProps,
				mapProps: this.props.mapProps,
				updatePersistedMapProps: this.props.updatePersistedMapProps,
				updateMapSelectedSRID: this.props.updateMapSelectedSRID,
				labelLookup: this.props.labelLookup,
				updateStationFilterInState: this.handleStationFilterUpdate.bind(this),
				spatialStationsFilter: this.props.spatialStationsFilter
			});
		})()
			.catch(error => {
				this.props.failWithError(error);
			});
	}

	componentWillUnmount() {
		if (this.initMap) {
			this.initMap.olWrapper.destroyMap();
			this.initMap = undefined;
		}
	}
}

function stateToProps(state: State) {
	return {
		specTable: state.specTable,
		stationPos4326Lookup: state.stationPos4326Lookup,
		labelLookup: state.labelLookup,
		spatialStationsFilter: state.spatialStationsFilter,
		mapProps: state.mapProps
	};
}

function dispatchToProps(dispatch: PortalDispatch) {
	return {
		failWithError: (error: Error) => failWithError(dispatch as PortalDispatch)(error),
		updateStationFilter: (filteredStationUris: Filter) => dispatch(spatialFilterUpdate(filteredStationUris)),
	};
}

export default connect(stateToProps, dispatchToProps)(SearchResultMap);
