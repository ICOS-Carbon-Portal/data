import React, { Component } from 'react';
import { connect } from 'react-redux';
import { State } from "../../models/State";
import InitMap, { UpdateMapSelectedSRID } from '../../models/InitMap';
import { PersistedMapProps } from '../../models/ol/OLWrapper';
import { TileLayerExtended } from '../../models/ol/baseMaps';


type StateProps = ReturnType<typeof stateToProps>;
type incommingProps = {
	tabHeader: string
	persistedMapProps: PersistedMapProps
	updatePersistedMapProps: (mapProps: PersistedMapProps) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
}
type OurProps = StateProps & incommingProps

class SearchResultMap extends Component<OurProps> {
	private initMap?: InitMap = undefined;

	constructor(props: OurProps) {
		super(props);
	}

	render() {
		if (this.initMap)
			this.initMap.updateProps({
				specTable: this.props.specTable,
				stationPos4326Lookup: this.props.stationPos4326Lookup,
				labelLookup: this.props.labelLookup,
			});

		return (
			<div id="map" style={{ width: '100%', height: '90vh' }} tabIndex={1}>
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
				mapRootelement: document.getElementById('map'),
				specTable: this.props.specTable,
				stationPos4326Lookup: this.props.stationPos4326Lookup,
				persistedMapProps: this.props.persistedMapProps,
				updatePersistedMapProps: this.props.updatePersistedMapProps,
				updateMapSelectedSRID: this.props.updateMapSelectedSRID,
				labelLookup: this.props.labelLookup,
			});
		})()
			.catch(error => {
				console.error(error);
			});
	}

	componentWillUnmount() {
		this.initMap.olWrapper.map
			.getLayers()
			.getArray()
			.filter(l => l.get('layerType') === 'baseMap')
			.forEach(bm => (bm as TileLayerExtended).getSource().clear());
		this.initMap.olWrapper.destroyMap();
		this.initMap = null;
	}
}

function stateToProps(state: State) {
	return {
		specTable: state.specTable,
		stationPos4326Lookup: state.stationPos4326Lookup,
		labelLookup: state.labelLookup,
	};
}

export default connect(stateToProps)(SearchResultMap);
