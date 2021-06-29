import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State, StationPos4326Lookup } from "../../models/State";
import InitMap, { PersistedMapPropsExtended, UpdateMapSelectedSRID } from '../../models/InitMap';
import { TileLayerExtended } from '../../models/ol/baseMaps';
import { PortalDispatch } from '../../store';
import { failWithError } from '../../actions/common';
import { specFilterUpdate } from '../../actions/search';
import { Value } from '../../models/SpecTable';
import { ColNames } from '../../models/CompositeSpecTable';
import { intersection, union } from '../../utils';


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

	handleStationFilterUpdate(stationUrisToState: Value[]){
		setTimeout(() => this.props.updateStationFilter(stationUrisToState), 50);
	}

	render() {
		if (this.initMap)
			this.initMap.incommingPropsUpdated({
				specTable: this.props.specTable,
				stationPos4326Lookup: this.props.stationPos4326Lookup,
				labelLookup: this.props.labelLookup,
			});

		return (
			<div id="map" style={{ width: '100%', height: '90vh' }} tabIndex={1}>
				<div id="stationFilterCtrl" className="ol-control ol-layer-control-ur" style={{ top: 70, fontSize: 20 }}></div>
				<div id="popover" className="ol-popup"></div>
				<div id="projSwitchCtrl" className="ol-layer-control ol-layer-control-lr" style={{ zIndex: 99, marginRight: 10, padding: 0 }}></div>
				<div id="layerCtrl" className="ol-layer-control ol-layer-control-ur"></div>
				<div id="attribution" className="ol-attribution ol-unselectable ol-control ol-uncollapsible" style={{right: 15}}>
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
				mapRootelement: document.getElementById('map')!,
				specTable: this.props.specTable,
				stationPos4326Lookup: this.props.stationPos4326Lookup,
				persistedMapProps: this.props.persistedMapProps,
				updatePersistedMapProps: this.props.updatePersistedMapProps,
				updateMapSelectedSRID: this.props.updateMapSelectedSRID,
				labelLookup: this.props.labelLookup,
				updateStationFilterInState: this.handleStationFilterUpdate.bind(this)
			});
		})()
			.catch(error => {
				this.props.failWithError(error);
			});
	}

	componentWillUnmount() {
		if (this.initMap) {
			this.initMap.olWrapper.map
				.getLayers()
				.getArray()
				.filter(l => l.get('layerType') === 'baseMap')
				.forEach(bm => (bm as TileLayerExtended).getSource().clear());
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
	};
}

function dispatchToProps(dispatch: PortalDispatch) {
	return {
		failWithError: (error: Error) => failWithError(dispatch as PortalDispatch)(error),
		updateStationFilter: (filteredStationUris: Value[]) => dispatch(specFilterUpdate('station', filteredStationUris)),
	};
}

export default connect(stateToProps, dispatchToProps)(SearchResultMap);
