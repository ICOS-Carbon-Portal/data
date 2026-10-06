import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { State } from "../../models/State";
import InitMap, { PersistedMapPropsExtended, UpdateMapSelectedSRID } from '../../models/InitMap';
import { PortalDispatch } from '../../store';
import { failWithError, showWarning } from '../../actions/common';
import { Value } from '../../models/SpecTable';
import { Copyright } from 'icos-cp-copyright';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type incomingProps = {
	tabHeader: string
	persistedMapProps: PersistedMapPropsExtended
	updatePersistedMapProps: (mapProps: PersistedMapPropsExtended) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
}
type OurProps = StateProps & DispatchProps & incomingProps

function StationsMap(props: OurProps) {
	const {allStations, mapProps, selectedStations, failWithError} = props;

	const initMapRef = useRef<InitMap | undefined>(undefined);
	const mapRootRef = useRef<HTMLDivElement>(null);
	const latestPropsRef = useRef(props);
	latestPropsRef.current = props;

	useEffect(() => {
		let initMap: InitMap | undefined;
		let isUnmounted = false;

		(async () => {
			const { default: InitMap } = await import(
				/* webpackMode: "lazy" */
				/* webpackChunkName: "init-map" */
				'../../models/InitMap'
			);

			if (isUnmounted || mapRootRef.current === null) {
				return;
			}

			// Read props after the await, since the store may have changed while the chunk was loading
			const {persistedMapProps, allStations, mapProps, selectedStations, stationPos4326Lookup,
				updateMapSelectedSRID, updatePersistedMapProps, showWarning, labelLookup} = latestPropsRef.current;

			initMap = new InitMap({
				mapRootElement: mapRootRef.current,
				allStations,
				stationPos4326Lookup,
				persistedMapProps,
				mapProps,
				updateMapSelectedSRID,
				updatePersistedMapProps,
				showWarning,
				labelLookup,
				selectedStations
			});

			initMapRef.current = initMap;
		})()
			.catch(error => {
				failWithError(error);
			});

		return () => {
			isUnmounted = true;
			initMap?.olWrapper.destroyMap();
			initMapRef.current = undefined;
		};
	}, []);

	useEffect(() => {
		const initMap = initMapRef.current;
		if (initMap === undefined) return;

		initMap.incomingPropsUpdated({
			allStations,
			mapProps,
			selectedStations
		});
	});

	return (
		<div ref={mapRootRef} style={{ width: '100%', height: '90vh', position: 'relative' }} tabIndex={1}>
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
		showWarning: (message: string) => showWarning(dispatch)(message),
	};
}

export default connect(stateToProps, dispatchToProps)(StationsMap);
