import React, { useState, useRef, useEffect, useCallback } from 'react';
import NetCDFMap, { getTileHelper, getLatLngBounds } from 'icos-cp-netcdfmap';
import 'leaflet/dist/leaflet.css';
import {ReactSpinner} from 'icos-cp-spinner';
import Legend from 'icos-cp-legend';
import Controls from './Controls';
import {throttle, debounce} from 'icos-cp-utils';
import {defaultGamma, Latlng, RangeValues} from '../models/State';
import {saveToRestheart} from '../../../common/main/backend';
import Timeserie from './Timeserie';
import RangeFilterInput from './RangeFilterInput';
import { AppProps } from '../containers/App';
import { Control } from '../models/ControlsHelper';
import { Copyright } from 'icos-cp-copyright';
import { BinRaster } from 'icos-cp-backend';
import { withChangedIdIfNeeded } from '../models/BinRasterHelper';
import legendFactory from '../models/LegendFactory';
import { VariableInfo } from '../backend';


type MapProps = Pick<AppProps, 'isSites' | 'isPIDProvided' | 'minMax' | 'fullMinMax' | 'legendLabel' | 'colorMaker' | 'controls' | 'variableEnhancer' | 'countriesTopo' | 'dateChanged' | 'delayChanged'
	| 'extraDimChanged' | 'gammaChanged' | 'colorRampChanged' | 'increment' | 'playingMovie' | 'playPauseMovie' | 'rasterFetchCount' | 'raster' | 'serviceChanged' | 'title'
	| 'variableChanged' | 'initSearchParams' | 'fetchTimeSerie' | 'timeserieData' | 'latlng' | 'showTSSpinner' | 'resetTimeserieData' | 'isFetchingTimeserieData' | 'rangeFilter' | 'setRangeFilter'>

const minHeight = 300;

export default function Map(props: MapProps) {
	const [height, setHeight] = useState(0);
	const [isShowTimeserieActive, setIsShowTimeserieActive] = useState(false);
	const [isRangeFilterInputsActive, setIsRangeFilterInputsActive] = useState(false);

	const countriesTs = Date.now();
	let center = props.initSearchParams.center ? props.initSearchParams.center.split(',') : ['52.5', '10'];
	let zoom: string | number = props.initSearchParams.zoom ?? 2;

	const objId = location.pathname.split('/').filter(part => part.length > 20).pop();
	const [prevVariables, setPrevVariables] = useState<Control<VariableInfo> | undefined>(undefined);

	useEffect(() => {
		const throttledUpdateHeight = throttle(updateHeight, 300);
		window.addEventListener("resize", throttledUpdateHeight);

		return () => window.removeEventListener("resize", throttledUpdateHeight);
	}, []);

	const legendDiv = useRef<HTMLDivElement>(null);

	updateURL();

	if (props.raster && height === 0) {
		updateHeight();
	}

	function updateURL() {
		if (props.isPIDProvided && props.rasterFetchCount > 0) {
			const {dates, extraDim, gammas, variables, colorMaps} = props.controls;
			const selectedVariable = variables.selected;
			if (prevVariables === undefined || prevVariables.selected?.shortName !== selectedVariable?.shortName) {
				setPrevVariables(variables);
				if (selectedVariable !== null) {
					saveToRestheart(formatData({objId: objId, variable: selectedVariable.shortName}));
				}
			}

			const searchParams: {k: string, v: string | null | undefined}[] = [
				{k: "date", v: dates.selected},
				{k: "extraDim", v: extraDim.selected},
				{k: "gamma", v: (gammas.selected ?? defaultGamma).toString(10)},
				{k: "varName", v: variables.selected?.shortName},
				{k: "center", v: center.join(",")},
				{k: "zoom", v: zoom.toString(10)},
				{k: "color", v: colorMaps.selected?.name},
			];

			const newSearch = "?" +
				searchParams
					.filter(({k, v}) => v !== undefined && v !== null)
					.map(({k, v}) => `${k}=${v}`)
					.join("&");

			if (newSearch.length > 1 && newSearch !== window.decodeURIComponent(window.location.search)) {
				const newURL = location.origin + location.pathname + newSearch;

				if (window.frameElement) {
					// Let calling page (through iframe) know what current url is
					window.top!.postMessage(newURL, '*');
				} else {
					history.replaceState({urlPath: newURL}, "", newURL);
				}
			}
		}
	}

	function updateHeight() {
		if (legendDiv.current) {
			setHeight(legendDiv.current.clientHeight);
		}
	}

	function mapEventCallback(event: string, payload: { center: Latlng, zoom: number }) {
		if (event === 'moveend' && payload && payload.center && payload.zoom) {
			const decimals = 5;
			center = [payload.center.lat.toFixed(decimals), payload.center.lng.toFixed(decimals)];
			zoom = payload.zoom;
			updateURL();
		}
	}

	function timeserieToggle(isShowTimeserieActive: boolean) {
		setIsShowTimeserieActive(isShowTimeserieActive);

		if (!isShowTimeserieActive) {
			props.resetTimeserieData();
		}
	}

	function closeTimeserie() {
		timeserieToggle(false);
	}

	// Because of the way NetCDFMap tracks events, we need to wrap timeserieMapClick in a ref, and then
	// provide a stable function that uses the current version of timeserieMapClick stored in the ref.
	const timeserieMapClick = (eventName: string, e: {latlng: Latlng | null}) => {
		if (props.raster && props.fetchTimeSerie) {
			const objId = props.controls.services.selected;
			const variable = props.controls.variables.selected?.shortName;
			const extraDimInd = props.controls.extraDim.selectedIdx;
			const xy = e.latlng ? getRasterXYFromLatLng(props.raster, e.latlng) : null;

			if (xy && objId !== null && variable !== undefined && e.latlng !== null) {
				props.fetchTimeSerie({objId, variable, extraDimInd, x: xy.x, y: xy.y, latlng: e.latlng});
				timeserieToggle(true);
			}
		}
	};

	const timeserieMapClickRef = useRef(timeserieMapClick);

	useEffect(() => {
		timeserieMapClickRef.current = timeserieMapClick;
	}, [timeserieMapClick]);

	const stableMapClickHandler = useCallback((eventName: string, e: {latlng: Latlng | null}) => {
		timeserieMapClickRef.current(eventName, e)
	}, []);

	function updateRangeFilterInputsVisibility() {
		setIsRangeFilterInputsActive(!isRangeFilterInputsActive);
	}

	function rangeFilterChanged(rangeValueChanges: RangeValues) {
		const rangeValues = { ...props.rangeFilter.rangeValues, ...rangeValueChanges};

		const valueFilter = (v: number) => {
			if (rangeValues.minRange === undefined && rangeValues.maxRange === undefined)
				return v;

			if (rangeValues.minRange !== undefined && v < rangeValues.minRange) {
				return rangeValues.minRange;

			} else if (rangeValues.maxRange !== undefined && v > rangeValues.maxRange) {
				return rangeValues.maxRange;

			} else {
				return v;
			}
		};

		props.setRangeFilter({ rangeValues, valueFilter });
	}

	const { gammas, colorMaps } = props.controls;
	const { rangeValues, valueFilter } = props.rangeFilter;

	const mapId = props.raster
		? (`${props.raster.id}_gamm_${gammas.selectedIdx}_palett_${colorMaps.selectedIdx ?? "?"}` +
			`_min_${rangeValues.minRange ?? "?"}_max_${rangeValues.maxRange ?? "?"}`)
		: undefined

	const needReset = !props.raster || !props.colorMaker
	const raster = needReset ? undefined : withChangedIdIfNeeded(props.raster, mapId)

	const showSpinner = props.countriesTopo.ts > countriesTs && props.rasterFetchCount === 0;
	const colorMap = colorMaps.selected
	const getLegend = (props.minMax === undefined || colorMap === null)
		? undefined
		: legendFactory(props.minMax, colorMap)

	const latLngBounds = getLatLngBounds(
		props.rasterFetchCount,
		props.initSearchParams.center,
		props.initSearchParams.zoom,
		raster
	);

	const containerHeight = height < minHeight ? minHeight : height - 10;

	return (
		<div id="content" className="container-fluid d-flex flex-column">
			{!window.frameElement && props.title &&
				<h2>{props.title}</h2>
			}
			<Controls
				isPIDProvided={props.isPIDProvided}
				marginTop={5}
				controls={props.controls}
				variableEnhancer={props.variableEnhancer}
				playingMovie={props.playingMovie}
				increment={props.increment}
				playPauseMovie={props.playPauseMovie}
				delayChanged={props.delayChanged}
				handleServiceChange={(newIdx) => {
					props.serviceChanged(newIdx);
					// https://data.icos-cp.eu/netcdf/ allows "browsing". Close time serie in case it's open
					closeTimeserie();
				}}
				handleVarNameChange={props.variableChanged}
				handleDateChange={props.dateChanged}
				handleGammaChange={props.gammaChanged}
				handleExtraDimChange={props.extraDimChanged}
				handleColorRampChange={props.colorRampChanged}
				isRangeFilterInputsActive={isRangeFilterInputsActive}
				handleRangeFilterInputsChange={updateRangeFilterInputsVisibility}
			/>

			<div id="map-container" className='flex-grow-1'>

				<Timeserie
					isSites={props.isSites}
					isActive={isShowTimeserieActive}
					varName={props.controls.variables.selected?.shortName}
					timeserieData={props.timeserieData}
					latlng={props.latlng}
					showTSSpinner={props.showTSSpinner}
					isFetchingTimeserieData={props.isFetchingTimeserieData}
					closeTimeserie={closeTimeserie}
				/>

				<div id="map">
					<NetCDFMap
						mapOptions={{
							center: center,
							zoom: zoom,
							forceCenter: [52.5, 10]
						}}
						raster={raster}
						reset={needReset}
						colorMaker={props.colorMaker}
						valueFilter={valueFilter}
						geoJson={props.countriesTopo.data}
						latLngBounds={latLngBounds}
						events={[
							{
								event: 'moveend',
								fn: (leafletMap: L.Map) => {
									return {center: leafletMap.getCenter(), zoom: leafletMap.getZoom()};
								},
								callback: mapEventCallback
							},
							{
								event: 'click',
								fn: (leafletMap: L.Map, e: Event) => e,
								callback: stableMapClickHandler
							}
						]}
					/>
					<Copyright rootStyleOverride={{position:'absolute', bottom:2, right:3}} />
				</div>
				<div id="legend" ref={legendDiv}>{
					getLegend
						? <Legend
							horizontal={false}
							canvasWidth={20}
							containerHeight={containerHeight}
							margin={7}
							getLegend={getLegend}
							legendId={mapId}
							legendText={props.legendLabel}
							decimals={3}
							useRangeValueFilters={true}
							rangeValues={rangeValues}
							rangeFilterChanged={rangeFilterChanged}
						/>
						: null
				}</div>

				<RangeFilterInput
					isActive={isRangeFilterInputsActive}
					onClose={updateRangeFilterInputsVisibility}
					minMax={props.minMax}
					fullMinMax={props.fullMinMax}
					rangeValues={rangeValues}
					rangeFilterChanged={debounce(rangeFilterChanged, 500)}
				/>
			</div>

			<ReactSpinner isSites={props.isSites} show={showSpinner} />

		</div>
	);
}

const getRasterXYFromLatLng = (raster: BinRaster, latlng: Latlng) => {
	const tileHelper = getTileHelper(raster);

	const xy = tileHelper.lookupPixel(latlng.lng, latlng.lat);

	return xy
		? {
			x: Math.round(xy.x - 0.5),
			y: Math.round(xy.y - 0.5)
		}
		: undefined;
};

const formatData = (dataToSave: { objId?: string, variable: string }) => {
	return {
		previewNetCDF: {
			params: {
				objId: dataToSave.objId,
				variable: dataToSave.variable
			}
		}
	}
};
