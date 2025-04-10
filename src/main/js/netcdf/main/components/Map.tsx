import React, { Component } from 'react';
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


type OurProps = Pick<AppProps, 'isSites' | 'isPIDProvided' | 'minMax' | 'fullMinMax' | 'legendLabel' | 'colorMaker' | 'controls' | 'variableEnhancer' | 'countriesTopo' | 'dateChanged' | 'delayChanged'
	| 'extraDimChanged' | 'gammaChanged' | 'colorRampChanged' | 'increment' | 'playingMovie' | 'playPauseMovie' | 'rasterFetchCount' | 'raster' | 'serviceChanged' | 'title'
	| 'variableChanged' | 'initSearchParams' | 'fetchTimeSerie' | 'timeserieData' | 'latlng' | 'showTSSpinner' | 'resetTimeserieData' | 'isFetchingTimeserieData' | 'rangeFilter' | 'setRangeFilter'>
type OurState = {
	height: number,
	isShowTimeserieActive: boolean,
	isRangeFilterInputsActive: boolean
}

const minHeight = 300;

export default class Map extends Component<OurProps, OurState> {
	private countriesTs: number;
	private center: string[];
	private zoom: string | number;
	private objId?: string;
	private prevVariables?: Control<VariableInfo>;
	private events: typeof Events;
	private getRasterXYFromLatLng?: Function;
	private legendDiv: HTMLDivElement;

	constructor(props: OurProps){
		super(props);
		this.state = {
			height: 0,
			isShowTimeserieActive: false,
			isRangeFilterInputsActive: false
		};

		this.countriesTs = Date.now();
		this.center = props.initSearchParams.center && props.initSearchParams.center.split(',') || ['52.5', '10'];
		this.zoom = props.initSearchParams.zoom || 2;

		this.objId = location.pathname.split('/').filter(part => part.length > 20).pop();
		this.prevVariables = undefined;

		this.events = new Events();
		this.events.addToTarget(window, "resize", throttle(this.updateHeight.bind(this), 300));

		this.getRasterXYFromLatLng = undefined;
		this.legendDiv = document.createElement('div');
	}

	updateURL(){
		if (this.props.isPIDProvided && this.props.rasterFetchCount > 0) {
			const {dates, extraDim, gammas, variables, colorMaps} = this.props.controls;
			const variable = variables.selected
			if (this.prevVariables === undefined || this.prevVariables.selected?.shortName !== variable?.shortName) {
				this.prevVariables = variables
				if (variable !== null) saveToRestheart(formatData({objId: this.objId, variable: variable.shortName}))
			}

			const dateParam = dates.selected ? `date=${dates.selected}` : undefined;
			const extraDimParam = extraDim.selected !== null ? `extraDim=${extraDim.selected}` : undefined;
			const gammaParam = gammas.selected !== defaultGamma ? `gamma=${gammas.selected}` : undefined;
			const varNameParam = variables.selected ? `varName=${variables.selected.shortName}` : undefined;
			const center = this.center ? `center=${this.center}` : undefined;
			const zoom = this.zoom ? `zoom=${this.zoom}` : undefined;
			const color = colorMaps.selected ? `color=${colorMaps.selected.name}` : undefined;

			const searchParams = [varNameParam, dateParam, gammaParam, extraDimParam, center, zoom, color];
			const newSearch = '?' + searchParams.filter(sp => sp).join('&');

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

	updateHeight(){
		this.setState({height: this.legendDiv.clientHeight});
	}

	componentWillReceiveProps(nextProps: OurProps) {
		if (nextProps.raster){
			if (this.state.height === 0) this.updateHeight();

			this.getRasterXYFromLatLng = getRasterXYFromLatLng(nextProps.raster);

			// https://data.icos-cp.eu/netcdf/ allows "browsing". Close time serie in case it's open
			if (this.props.controls.services.selected !== nextProps.controls.services.selected) {
				this.closeTimeserie();
			}
		}
	}

	componentDidUpdate(nextProps: OurProps){
		this.updateURL();
	}

	componentWillUnmount(){
		this.events.clear();
	}

	mapEventCallback(event: string, payload: { center: Latlng, zoom: number }){
		if (event === 'moveend' && payload && payload.center && payload.zoom) {
			const decimals = 5;
			this.center = [payload.center.lat.toFixed(decimals), payload.center.lng.toFixed(decimals)];
			this.zoom = payload.zoom;
			this.updateURL();
		}
	}

	timeserieToggle(isShowTimeserieActive: boolean){
		this.setState({isShowTimeserieActive});

		if (!isShowTimeserieActive) this.props.resetTimeserieData();
	}

	closeTimeserie(){
		this.timeserieToggle(false);
	}

	timeserieMapClick(eventName: string, e: { latlng: Latlng}){
		if (this.getRasterXYFromLatLng && this.props.fetchTimeSerie) {
			const objId = this.props.controls.services.selected;
			const variable = this.props.controls.variables.selected?.shortName;
			const extraDimInd = this.props.controls.extraDim.selectedIdx;
			const xy = this.getRasterXYFromLatLng(e.latlng);

			if (xy && objId !== null && variable !== undefined) {
				this.props.fetchTimeSerie({objId, variable, extraDimInd, x: xy.x, y: xy.y, latlng: e.latlng});
				this.timeserieToggle(true);
			}
		}
	}

	updateRangeFilterInputsVisibility(){
		this.setState({isRangeFilterInputsActive: !this.state.isRangeFilterInputsActive});
	}

	rangeFilterChanged(rangeValueChanges: RangeValues){
		const rangeValues = { ...this.props.rangeFilter.rangeValues, ...rangeValueChanges};

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

		this.props.setRangeFilter({ rangeValues, valueFilter });
	}

	render() {
		const state = this.state;
		const props = this.props;
		const { gammas, colorMaps } = props.controls;
		const { rangeValues, valueFilter } = props.rangeFilter;

		const mapId = props.raster
			? (`${props.raster.id}_gamm_${gammas.selectedIdx}_palett_${colorMaps.selectedIdx ?? "?"}` +
				`_min_${rangeValues.minRange ?? "?"}_max_${rangeValues.maxRange ?? "?"}`)
			: undefined

		const needReset = !props.raster || !props.colorMaker
		const raster = needReset ? undefined : withChangedIdIfNeeded(props.raster, mapId)

		const showSpinner = props.countriesTopo.ts > this.countriesTs && props.rasterFetchCount === 0;
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

		const containerHeight = state.height < minHeight ? minHeight : state.height - 10;

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
					isRangeFilterInputsActive={state.isRangeFilterInputsActive}
					handleRangeFilterInputsChange={this.updateRangeFilterInputsVisibility.bind(this)}
				/>

				<div id="map-container" className='flex-grow-1'>

					<Timeserie
						isSites={props.isSites}
						isActive={state.isShowTimeserieActive}
						varName={props.controls.variables.selected?.shortName}
						timeserieData={props.timeserieData}
						latlng={props.latlng}
						showTSSpinner={props.showTSSpinner}
						isFetchingTimeserieData={props.isFetchingTimeserieData}
						closeTimeserie={this.closeTimeserie.bind(this)}
					/>

					<div id="map">
						<NetCDFMap
							mapOptions={{
								center: this.center,
								zoom: this.zoom,
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
									callback: this.mapEventCallback.bind(this)
								},
								{
									event: 'click',
									fn: (leafletMap: L.Map, e: Event) => e,
									callback: this.timeserieMapClick.bind(this)
								}
							]}
						/>
						<Copyright rootStyleOverride={{position:'absolute', bottom:2, right:3}} />
					</div>
					<div id="legend" ref={(div: HTMLDivElement) => this.legendDiv = div}>{
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
								rangeFilterChanged={this.rangeFilterChanged.bind(this)}
							/>
							: null
					}</div>

					<RangeFilterInput
						isActive={state.isRangeFilterInputsActive}
						onClose={this.updateRangeFilterInputsVisibility.bind(this)}
						minMax={props.minMax}
						fullMinMax={props.fullMinMax}
						rangeValues={rangeValues}
						rangeFilterChanged={debounce(this.rangeFilterChanged.bind(this), 500)}
					/>
				</div>

				<ReactSpinner isSites={props.isSites} show={showSpinner} />

			</div>
		);
	}
}

const getRasterXYFromLatLng = (raster: BinRaster) => {
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
