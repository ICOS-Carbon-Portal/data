import React, { useState, useRef } from 'react';
import NetCDFMap, { getTileHelper, getLatLngBounds } from 'icos-cp-netcdfmap';
import 'leaflet/dist/leaflet.css';
import {ReactSpinner} from 'icos-cp-spinner';
import Legend from 'icos-cp-legend';
import Controls from './Controls';
import {throttle, Events, debounce} from 'icos-cp-utils';
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
type OurState = {
	height: number,
	isShowTimeserieActive: boolean,
	isRangeFilterInputsActive: boolean
}

const minHeight = 300;

export default function Map(props: MapProps) {
	const [height, setHeight] = useState(0);
	const [isShowTimeserieActive, setIsShowTimeserieActive] = useState(false);
	const [isRangeFilterInputsActive, setIsRangeFilterInputsActive] = useState(false);

	const countriesTs = Date.now();
	let center = props.initSearchParams.center && props.initSearchParams.center.split(',') || ['52.5', '10'];
	let zoom: string | number = props.initSearchParams.zoom ?? 2;

	const objId = location.pathname.split('/').filter(part => part.length > 20).pop();
	let prevVariables: Control<VariableInfo> | undefined = undefined;

	const events = new Events();
	events.addToTarget(window, "resize", throttle(updateHeight, 300));

	let getXYFromLatLng: Function | undefined = getRasterXYFromLatLng(props.raster);
	const legendDiv = useRef<HTMLDivElement | null>(null);

	function updateURL() {
		if (props.isPIDProvided && props.rasterFetchCount > 0) {
			const {dates, extraDim, gammas, variables, colorMaps} = props.controls;
			const variable = variables.selected;
			if (prevVariables === undefined || prevVariables.selected?.shortName !== variable?.shortName) {
				prevVariables = variables
				if (variable !== null) saveToRestheart(formatData({objId: objId, variable: variable.shortName}))
			}

			const dateParam = dates.selected ? `date=${dates.selected}` : "";
			const extraDimParam = extraDim.selected !== null ? `extraDim=${extraDim.selected}` : "";
			const gammaParam = gammas.selected !== defaultGamma ? `gamma=${gammas.selected}` : "";
			const varNameParam = variables.selected ? `varName=${variables.selected.shortName}` : "";
			const centerParam = center ? `center=${center}` : "";
			const zoomParam = zoom ? `zoom=${zoom}` : "";
			const colorParam = colorMaps.selected ? `color=${colorMaps.selected.name}` : "";

			const searchParams = [varNameParam, dateParam, gammaParam, extraDimParam, centerParam, zoomParam, colorParam];
			const newSearch = '?' + searchParams.filter(sp => sp !== "").join('&');

			if (newSearch.length > 1 && newSearch !== window.decodeURIComponent(window.location.search)) {
				const newURL = location.origin + location.pathname + newSearch;

				if (window.frameElement) {
					//Let calling page (through iframe) know what current url is
					window.top!.postMessage(newURL, '*');
				} else {
					history.replaceState({urlPath: newURL}, "", newURL);
				}
			}
		}
	}

	function updateHeight() {
		if(legendDiv.current) {
			setHeight(legendDiv.current.clientHeight);
		}
	}

	function componentWillReceiveProps(nextProps: MapProps) {
		if (nextProps.raster) {
			if (height === 0) updateHeight();

			getXYFromLatLng = getRasterXYFromLatLng(nextProps.raster);

			// https://data.icos-cp.eu/netcdf/ allows "browsing". Close time serie in case it's open
			if (props.controls.services.selected !== nextProps.controls.services.selected) {
				closeTimeserie();
			}
		}
	}

	function componentDidUpdate(nextProps: MapProps) {
		updateURL();
	}

	function componentWillUnmount() {
		events.clear();
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

	function timeserieMapClick(eventName: string, e: {latlng: Latlng}) {
		if (getXYFromLatLng && props.fetchTimeSerie) {
			const objId = props.controls.services.selected;
			const variable = props.controls.variables.selected?.shortName;
			const extraDimInd = props.controls.extraDim.selectedIdx;
			const xy = getXYFromLatLng(e.latlng);

			if (xy && objId !== null && variable !== undefined) {
				props.fetchTimeSerie({objId, variable, extraDimInd, x: xy.x, y: xy.y, latlng: e.latlng});
				timeserieToggle(true);
			}
		}
	}

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
				handleServiceChange={props.serviceChanged}
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
								callback: timeserieMapClick
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

const getRasterXYFromLatLng = (raster: BinRaster | undefined) => {
	if (raster === undefined) {
		return undefined;
	}

	const tileHelper = getTileHelper(raster);

	return (latlng: Latlng) => {
		const xy = tileHelper.lookupPixel(latlng.lng, latlng.lat);

		return xy
			? {
				x: Math.round(xy.x - 0.5),
				y: Math.round(xy.y - 0.5)
			}
			: undefined;
	}
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
