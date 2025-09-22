import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import NetCDFMap, { getTileHelper, getLatLngBounds } from 'icos-cp-netcdfmap';
import 'leaflet/dist/leaflet.css';
import {ReactSpinner} from 'icos-cp-spinner';
import Legend from 'icos-cp-legend';
import Controls from './Controls';
import {throttle, debounce} from 'icos-cp-utils';
import {Latlng, RangeFilter, TimeserieData, TimeserieParams} from '../models/State';
import {saveToRestheart} from '../../../common/main/backend';
import Timeserie from './Timeserie';
import RangeFilterInput from './RangeFilterInput';
import { Control, getRasterRequest, getSelectedControl } from '../models/ControlsHelper';
import { Copyright } from 'icos-cp-copyright';
import { BinRaster } from 'icos-cp-backend';
import { withChangedIdIfNeeded } from '../models/BinRasterHelper';
import legendFactory from '../models/LegendFactory';
import { getTimeserie, rasterFetcher, VariableInfo } from '../backend';
import { useAppDispatch, useAppSelector } from '../store';
import { rangeFilterSet, rasterFetched, serviceSelected } from '../reducer';
import { failWithError, incrementIfNeeded } from '../actions';
import { defaultGamma, getColorMaker } from '../models/Colormap';


export default function Map() {
	const dispatch = useAppDispatch();

	const initSearchParams = useAppSelector(state => state.initSearchParams);
	const controls = useAppSelector(state => state.controls);
	const { services, variables, dates, extraDim, gammas, delays, colorMaps } = controls;
	const playingMovie = useAppSelector(state => state.playingMovie);
	const isPIDProvided = useAppSelector(state => state.isPIDProvided);
	const rasterFetchCount = useAppSelector(state => state.rasterFetchCount);
	const rangeFilter = useAppSelector(state => state.rangeFilter);
	const minMax = useAppSelector(state => state.minMax);
	const fullMinMax = useAppSelector(state => state.fullMinMax);
	const countriesTopo = useAppSelector(state => state.countriesTopo);
	const title = useAppSelector(state => state.title);
	const variableEnhancer = useAppSelector(state => state.variableEnhancer);
	const isSites = useAppSelector(state => state.isSites);
	const legendLabel = useAppSelector(state => state.legendLabel);

	// TODO reorganize; group all State variables together, group useEffects, group functions, etc.
	const [height, setHeight] = useState(0);
	const [isShowTimeserieActive, setIsShowTimeserieActive] = useState(false);
	const [isRangeFilterInputsActive, setIsRangeFilterInputsActive] = useState(false);
	const [center, setCenter] = useState(initSearchParams.center ? initSearchParams.center.split(',') : ['52.5', '10']);
	const [zoom, setZoom] = useState<string | number>(initSearchParams.zoom ?? 2);

	const [isFetchingTs, setIsFetchingTs] = useState(false);
	const [data, setData] = useState<TimeserieData[]>();
	const [latlng, setLatlng] = useState<Latlng>();

	// this is a skeevy way of getting PID. I don't really like it
	const objId = location.pathname.split('/').filter(part => part.length > 20).pop();
	const [prevVariables, setPrevVariables] = useState<Control<VariableInfo> | undefined>(undefined);

	useEffect(() => {
		const throttledUpdateHeight = throttle(updateHeight, 300);
		window.addEventListener("resize", throttledUpdateHeight);

		return () => window.removeEventListener("resize", throttledUpdateHeight);
	}, []);

	const legendDiv = useRef<HTMLDivElement>(null);

	const countriesTs = Date.now();
	const minHeight = 300;

	updateURL();

	const [raster, setRaster] = useState<BinRaster>();

	useEffect(() => {
		const request = getRasterRequest(controls);
	
		if (request === undefined) {
			return;
		}
	
		const delay = playingMovie ? (getSelectedControl(delays) ?? 200) : 0;
		rasterFetcher.fetch(request, delay).then(
			fetchedRaster => {
				setRaster(fetchedRaster);
				dispatch(rasterFetched({id: fetchedRaster.id, stats: fetchedRaster.stats}));
				dispatch(incrementIfNeeded);
			},
			err => dispatch(failWithError(err))
		)
	}, [controls, playingMovie] );

	if (raster && height === 0) {
		updateHeight();
	}

	function updateURL() {
		if (isPIDProvided && rasterFetchCount > 0) {
			const selectedVariable = getSelectedControl(variables);
			if (prevVariables === undefined || getSelectedControl(prevVariables)?.shortName !== selectedVariable?.shortName) {
				setPrevVariables(variables);
				if (selectedVariable !== null) {
					saveToRestheart(formatData({objId: objId, variable: selectedVariable.shortName}));
				}
			}

			const searchParams: {k: string, v: string | null | undefined}[] = [
				{k: "date", v: getSelectedControl(dates)},
				{k: "extraDim", v: getSelectedControl(extraDim)},
				{k: "gamma", v: (getSelectedControl(gammas) ?? defaultGamma).toString(10)},
				{k: "varName", v: getSelectedControl(variables)?.shortName},
				{k: "center", v: center.join(",")},
				{k: "zoom", v: zoom.toString(10)},
				{k: "color", v: getSelectedControl(colorMaps)?.name},
				{k: "rangeMin", v: rangeFilter.minRange?.toString(10)},
				{k: "rangeMax", v: rangeFilter.maxRange?.toString(10)},
			];

			const newSearch = "?" +
				searchParams
					.filter(({k, v}) => v !== undefined && v !== null)
					.map(({k, v}) => `${k}=${v}`)
					.join("&");
			// TODO we should probably not be doing this here?
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
			setCenter([payload.center.lat.toFixed(decimals), payload.center.lng.toFixed(decimals)]);
			setZoom(payload.zoom);
			updateURL();
		}
	}

	function closeTimeserie() {
		setIsFetchingTs(false);
		setIsShowTimeserieActive(false);
		setData(undefined);
	}

	// Because of the way NetCDFMap tracks events, we need to wrap timeserieMapClick in a ref, and then
	// provide a stable function that uses the current version of timeserieMapClick stored in the ref.
	const timeserieMapClick = useCallback((eventName: string, e: {latlng: Latlng | null}) => {
		console.log("timeserieMapClick was called");
		if (raster) {
			const objId = getSelectedControl(services);
			const variable = getSelectedControl(variables)?.shortName;
			const extraDimInd = extraDim.selectedIdx;
			const xy = e.latlng ? getRasterXYFromLatLng(raster, e.latlng) : null;

			if (xy && objId !== null && variable !== undefined && e.latlng !== null) {
				if (e.latlng !== latlng) {
					setLatlng(e.latlng);
				}
				setIsFetchingTs(true);
				setIsShowTimeserieActive(true);
				const params = {objId, variable, extraDimInd, x: xy.x, y: xy.y, latlng: e.latlng};
				updateTimeserieData(params);
			}
		}
	}, [services, variables, extraDim, raster]);

	function updateTimeserieData(params: TimeserieParams) {
		getTimeserie(params).then(
			yValues => {
				console.log("updateTimeserieData: getTimeserie success")
				console.log(yValues);
				setIsFetchingTs(false);
				if (yValues.length > 0) {
					setData(dates.values.length === yValues.length
						? dates.values.map((date: string, idx: number) => [new Date(date), yValues[idx]])
						: [[0, 1]]);
				} else {
					setData(undefined);
				}
			},
			err => {
				setIsFetchingTs(false);
				dispatch(failWithError(err));
			}
		);
	}

	//TODO test if we can just pass in timeserieMapClick now, with a useCallback wrapper
	const timeserieMapClickRef = useRef(timeserieMapClick);

	useEffect(() => {
		timeserieMapClickRef.current = timeserieMapClick;
	}, [timeserieMapClick]);

	const stableMapClickHandler = useCallback((eventName: string, e: {latlng: Latlng | null}) => {
		timeserieMapClickRef.current(eventName, e)
	}, []);

	// timeserieData should also be updated when variable is changed, if it is open
	useEffect(() => {
		timeserieMapClick("changed", {latlng: latlng ?? null});
	}, [variables, latlng])

	function updateRangeFilterInputsVisibility() {
		setIsRangeFilterInputsActive(!isRangeFilterInputsActive);
	}

	// TODO: move to action in its own right, since all info is in payload or state
	function rangeFilterChanged(rangeValueChanges: RangeFilter) {
		dispatch(rangeFilterSet(rangeValueChanges));
	}

	const mapId = raster
		? (`${raster.id}_gamm_${gammas.selectedIdx}_palett_${colorMaps.selectedIdx ?? "?"}` +
			`_min_${rangeFilter.minRange ?? "?"}_max_${rangeFilter.maxRange ?? "?"}`)
		: undefined;

	const colorMaker = useMemo(() => {
		return getColorMaker(minMax, colorMaps);
	}, [minMax, colorMaps]);

	const needReset = !raster || !colorMaker;
	const renderedRaster = needReset ? undefined : withChangedIdIfNeeded(raster, mapId);

	const showSpinner = countriesTopo.ts > countriesTs && rasterFetchCount === 0;
	const colorMap = getSelectedControl(colorMaps);
	const getLegend = (minMax === undefined || colorMap === null)
		? undefined
		: legendFactory(minMax, colorMap);

	const latLngBounds = getLatLngBounds(
		rasterFetchCount,
		center,
		zoom,
		raster
	);

	const containerHeight = height < minHeight ? minHeight : height - 10;

	const valueFilter = useCallback(
		((v: number) => {
			if (rangeFilter.minRange === undefined && rangeFilter.maxRange === undefined)
				return v;
	
			if (rangeFilter.minRange !== undefined && v < rangeFilter.minRange) {
				return rangeFilter.minRange;
	
			} else if (rangeFilter.maxRange !== undefined && v > rangeFilter.maxRange) {
				return rangeFilter.maxRange;
	
			} else {
				return v;
			}
		}), [rangeFilter]);

	return (
		<div id="content" className="container-fluid d-flex flex-column">
			{!window.frameElement && title &&
				<h2>{title}</h2>
			}
			<Controls
				isPIDProvided={isPIDProvided}
				marginTop={5}
				variableEnhancer={variableEnhancer}
				playingMovie={playingMovie}
				handleServiceChange={(newIdx) => {
					dispatch(serviceSelected(newIdx));
					// https://data.icos-cp.eu/netcdf/ allows "browsing". Close time serie in case it's open
					closeTimeserie();
				}}
				isRangeFilterInputsActive={isRangeFilterInputsActive}
				handleRangeFilterInputsChange={updateRangeFilterInputsVisibility}
			/>

			<div id="map-container" className='flex-grow-1'>

				<Timeserie
					isSites={isSites}
					isActive={isShowTimeserieActive}
					varName={getSelectedControl(variables)?.shortName}
					closeTimeserie={closeTimeserie}
					timeserieData={data}
					isFetchingTimeserieData={isFetchingTs}
					latlng={latlng}
				/>

				<div id="map">
					<NetCDFMap
						mapOptions={{
							center: center,
							zoom: zoom,
							forceCenter: [52.5, 10]
						}}
						raster={renderedRaster}
						reset={needReset}
						colorMaker={colorMaker}
						valueFilter={valueFilter}
						geoJson={countriesTopo.data}
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
							legendText={legendLabel}
							decimals={3}
							useRangeValueFilters={true}
							rangeValues={rangeFilter}
							rangeFilterChanged={rangeFilterChanged}
						/>
						: null
				}</div>

				<RangeFilterInput
					isActive={isRangeFilterInputsActive}
					onClose={updateRangeFilterInputsVisibility}
					minMax={minMax}
					fullMinMax={fullMinMax}
					rangeValues={rangeFilter}
					rangeFilterChanged={debounce(rangeFilterChanged, 500)}
				/>
			</div>

			<ReactSpinner isSites={isSites} show={showSpinner} />

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
