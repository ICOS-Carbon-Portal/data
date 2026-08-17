import React, { Component, CSSProperties } from 'react';
import { connect } from 'react-redux';
import { State } from "../../models/State";
import InitMap, { PersistedMapPropsExtended, UpdateMapSelectedSRID } from '../../models/InitMap';
import { PortalDispatch } from '../../store';
import { failWithError } from '../../actions/common';
import { Value } from '../../models/SpecTable';
import { Copyright } from 'icos-cp-copyright';
import config from '../../config';


const mapAspectRatio = '1 / 1';
const mapMaxHeight = 'calc(100vh - 140px)'; // accounts for margin and header
// The preview and the full map are on the page at the same time, and the element
// ids they look up have to tell them apart
const previewIdPrefix = 'preview-';

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type incommingProps = {
	persistedMapProps: PersistedMapPropsExtended
	updatePersistedMapProps: (mapProps: PersistedMapPropsExtended) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
	isPreview?: boolean
}
type OurProps = StateProps & DispatchProps & incommingProps

class StationsMap extends Component<OurProps> {
	private initMap?: InitMap = undefined;

	constructor(props: OurProps) {
		super(props);
	}

	componentDidUpdate(){
		if (this.initMap === undefined) return;

		this.initMap.incomingPropsUpdated({
			allStations: this.props.allStations,
			mapProps: this.props.mapProps,
			selectedStations: this.props.selectedStations
		});
	}

	private get idPrefix() {
		return this.props.isPreview ? previewIdPrefix : '';
	}

	render() {
		const { isPreview } = this.props;
		const idPrefix = this.idPrefix;
		// A preview fills the frame it is given; on its own the map sizes itself
		const style: CSSProperties = isPreview
			? { position: 'absolute', inset: 0 }
			: { width: '100%', aspectRatio: mapAspectRatio, maxHeight: mapMaxHeight, position: 'relative' };

		return (
			<div id={idPrefix + 'map'} className={isPreview ? 'stations-map-preview' : undefined} style={style} tabIndex={isPreview ? -1 : 1}>
				<div id={idPrefix + 'stationFilterCtrl'} className="ol-control ol-layer-control-ur" style={{ top: 70, fontSize: 20 }}></div>
				<div id={idPrefix + 'popover'} className="ol-popup"></div>
				<div id={idPrefix + 'projSwitchCtrl'} className="ol-layer-control ol-layer-control-lr" style={{ zIndex: 99, marginRight: 10, padding: 0 }}></div>
				<div id={idPrefix + 'layerCtrl'} className="ol-layer-control ol-layer-control-ur"></div>
				<div id={idPrefix + 'attribution'} className="ol-attribution ol-unselectable ol-control ol-uncollapsible" style={{right: 15}}>
					<ul>
						<li>
							<Copyright />
						</li>
					</ul>
					<ul>
						<li id={idPrefix + 'baseMapAttribution'} />
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
				mapRootElement: document.getElementById(this.idPrefix + 'map')!,
				idPrefix: this.idPrefix,
				iconStyles: this.props.isPreview ? config.olMapSettings.smallIconStyles : undefined,
				keepFitted: this.props.isPreview,
				allStations: this.props.allStations,
				stationPos4326Lookup: this.props.stationPos4326Lookup,
				persistedMapProps: this.props.persistedMapProps,
				mapProps: this.props.mapProps,
				updateMapSelectedSRID: this.props.updateMapSelectedSRID,
				updatePersistedMapProps: this.props.updatePersistedMapProps,
				labelLookup: this.props.labelLookup,
				selectedStations: this.props.selectedStations
			})
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
		allStations: state.baseDobjStats.getAllColValues("station").filter(Value.isString),
		stationPos4326Lookup: state.stationPos4326Lookup,
		labelLookup: state.labelLookup,
		selectedStations: state.specTable.origins.getDistinctColValues("station").filter(Value.isString),
		mapProps: state.mapProps
	};
}

function dispatchToProps(dispatch: PortalDispatch) {
	return {
		failWithError: (error: Error) => failWithError(dispatch)(error),
	};
}

export default connect(stateToProps, dispatchToProps)(StationsMap);
