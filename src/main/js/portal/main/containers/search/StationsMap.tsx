import React, { CSSProperties, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { State } from "../../models/State";
import InitMap, { PersistedMapPropsExtended, UpdateMapSelectedSRID } from '../../models/InitMap';
import { PortalDispatch } from '../../store';
import { failWithError, showWarning } from '../../actions/common';
import { Value } from '../../models/SpecTable';
import { Copyright } from 'icos-cp-copyright';
import config from '../../config';


const mapAspectRatio = '1 / 1';
const mapMaxHeight = 'calc(100vh - 140px)'; // accounts for margin and header
const previewIdPrefix = 'preview-';

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type incomingProps = {
	persistedMapProps: PersistedMapPropsExtended
	updatePersistedMapProps: (mapProps: PersistedMapPropsExtended) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
	isPreview?: boolean
}
type OurProps = StateProps & DispatchProps & incomingProps

function StationsMap(props: OurProps) {
	const {persistedMapProps, allStations, mapProps, selectedStations, isPreview, stationPos4326Lookup,
		updateMapSelectedSRID, updatePersistedMapProps, showWarning, labelLookup, failWithError} = props;
	const idPrefix = isPreview ? previewIdPrefix : '';

	const initMapRef = useRef<InitMap | undefined>(undefined);
	const mapRootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (mapRootRef.current === null) {
			return;
		}

		let initMap: InitMap;

		try {
			initMap = new InitMap({
				mapRootElement: mapRootRef.current,
				idPrefix,
				iconStyles: isPreview ? config.olMapSettings.smallIconStyles : undefined,
				keepFitted: isPreview,
				showDeleteRectBtns: !isPreview,
				hideExcludedStations: isPreview,
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
		} catch (error) {
			failWithError(error as Error);
			return;
		}

		initMapRef.current = initMap;

		return () => {
			initMap.olWrapper.destroyMap();
			initMapRef.current = undefined;
		};
	}, []);

	useEffect(() => {
		const initMap = initMapRef.current;
		if (initMap === undefined) return;

		initMap.baseMapUpdated(persistedMapProps.baseMap);

		initMap.incomingPropsUpdated({
			allStations,
			mapProps,
			selectedStations
		});
	});

	const style: CSSProperties = isPreview
		? { position: 'absolute', inset: 0 }
		: { width: '100%', aspectRatio: mapAspectRatio, maxHeight: mapMaxHeight, position: 'relative' };

	return (
		<div ref={mapRootRef} className={isPreview ? 'stations-map-preview' : undefined} style={style} tabIndex={isPreview ? -1 : 1}>
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
