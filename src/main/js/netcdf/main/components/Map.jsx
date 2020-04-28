import React, { Component } from 'react';
import NetCDFMap, {getTileHelper} from './NetCDFMap';
import '../../node_modules/icos-cp-netcdfmap/dist/leaflet.css';
import {ReactSpinner} from 'icos-cp-spinner';
import Legend from 'icos-cp-legend';
import Controls from './Controls.jsx';
import {throttle, Events, debounce} from 'icos-cp-utils';
import {defaultGamma} from '../store';
import {saveToRestheart} from '../../../common/main/backend';
import Timeserie from './Timeserie';
import RangeFilterInput from './RangeFilterInput';


const minHeight = 300;

export default class Map extends Component {
	constructor(props){
		super(props);
		this.state = {
			height: null,
			isShowTimeserieActive: false,
			isRangeFilterInputsActive: false,
			rangeValues: {},
			valueFilter: v => v
		};

		this.countriesTs = Date.now();
		this.center = props.initSearchParams.center && props.initSearchParams.center.split(',') || [52.5, 10];
		this.zoom = props.initSearchParams.zoom || 2;

		this.objId = location.pathname.split('/').filter(part => part.length > 20).pop();
		this.prevVariables = undefined;

		this.events = new Events();
		this.events.addToTarget(window, "resize", throttle(this.updateHeight.bind(this), 300));

		this.getRasterXYFromLatLng = undefined;
	}

	updateURL(){
		if (this.props.isPIDProvided && this.props.rasterFetchCount > 0) {
			const {dates, elevations, gammas, variables, colorRamps} = this.props.controls;

			if (this.prevVariables === undefined || this.prevVariables.selected !== variables.selected) {
				this.prevVariables = variables;
				saveToRestheart(formatData({objId: this.objId, variable: variables.selected}));
			}

			const dateParam = dates.selectedIdx > 0 && dates.selected ? `date=${dates.selected}` : undefined;
			const elevationParam = elevations.selectedIdx > 0 && elevations.selected ? `elevation=${elevations.selected}` : undefined;
			const gammaParam = gammas.selected !== defaultGamma ? `gamma=${gammas.selected}` : undefined;
			const varNameParam = variables.selectedIdx > 0 && variables.selected ? `varName=${variables.selected}` : undefined;
			const center = this.center ? `center=${this.center}` : undefined;
			const zoom = this.zoom ? `zoom=${this.zoom}` : undefined;
			const color = colorRamps.selected ? `color=${colorRamps.selected}` : undefined;

			const searchParams = [varNameParam, dateParam, gammaParam, elevationParam, center, zoom, color];
			const newSearch = '?' + searchParams.filter(sp => sp).join('&');

			if (newSearch.length > 1 && newSearch !== window.decodeURIComponent(window.location.search)) {
				const newURL = location.origin + location.pathname + newSearch;

				if (window.frameElement) {
					//Let calling page (through iframe) know what current url is
					window.top.postMessage(newURL, '*');
				} else {
					history.pushState({urlPath: newURL}, "", newURL);
				}
			}
		}
	}

	updateHeight(){
		this.setState({height: this.legendDiv.clientHeight});
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.raster){
			if (this.state.height === null) this.updateHeight();

			this.getRasterXYFromLatLng = getRasterXYFromLatLng(nextProps.raster);

			// https://data.icos-cp.eu/netcdf/ allows "browsing". Close time serie in case it's open
			if (this.props.controls.services.selected !== nextProps.controls.services.selected) {
				this.closeTimeserie();
			}
		}
	}

	componentDidUpdate(nextProps){
		this.updateURL();
	}

	componentWillUnmount(){
		this.events.clear();
	}

	mapEventCallback(event, payload){
		if (event === 'moveend' && payload && payload.center && payload.zoom) {
			const decimals = 5;
			this.center = [payload.center.lat.toFixed(decimals), payload.center.lng.toFixed(decimals)];
			this.zoom = payload.zoom;
			this.updateURL();
		}
	}

	timeserieToggle(isShowTimeserieActive){
		this.setState({isShowTimeserieActive});

		if (!isShowTimeserieActive) this.props.resetTimeserieData();
	}

	closeTimeserie(){
		this.timeserieToggle(false);
	}

	timeserieMapClick(eventName, e){
		if (this.getRasterXYFromLatLng && this.props.fetchTimeSerie) {
			const objId = this.props.controls.services.selected;
			const variable = this.props.controls.variables.selected;
			const elevation = this.props.controls.elevations.selected;
			const xy = this.getRasterXYFromLatLng(e.latlng);

			if (xy && this.props.fetchTimeSerie) {
				this.props.fetchTimeSerie({objId, variable, elevation, x: xy.x, y: xy.y, latlng: e.latlng});
				this.timeserieToggle(true);
			}
		}
	}

	updateRangeFilterInputsVisibility(){
		this.setState({isRangeFilterInputsActive: !this.state.isRangeFilterInputsActive});
	}

	rangeFilterChanged(rangeValueChanges){
		const rangeValues = {...this.state.rangeValues, ...rangeValueChanges};
		const hasMinRange = rangeValues.minRange !== undefined;
		const hasMaxRange = rangeValues.maxRange !== undefined;

		const valueFilter = v => {
			if (!hasMinRange && !hasMaxRange)
				return v;

			if (hasMinRange && v < rangeValues.minRange) {
				return rangeValues.minRange;

			} else if (hasMaxRange && v > rangeValues.maxRange) {
				return rangeValues.maxRange;

			} else {
				return v;
			}
		};

		this.setState({valueFilter, rangeValues});
	}

	render() {
		const state = this.state;
		const props = this.props;

		const showSpinner = props.countriesTopo.ts > this.countriesTs && props.rasterFetchCount === 0;
		const colorMaker = props.colorMaker ? props.colorMaker.makeColor.bind(props.colorMaker) : null;
		const getLegend = props.colorMaker ? props.colorMaker.getLegend.bind(props.colorMaker) : null;
		const legendId = props.raster
			? props.raster.id + '_' + state.gamma + '_' + JSON.stringify(state.rangeValues)
			: "";
		const latLngBounds = getLatLngBounds(
			props.rasterFetchCount,
			props.initSearchParams.center,
			props.initSearchParams.zoom,
			props.raster
		);
		const containerHeight = state.height < minHeight ? minHeight : state.height;

		if (props.raster) {
			// A change in raster id triggers a rerender of map
			props.raster.id = props.raster.basicId
				+ props.controls.gammas.selectedIdx
				+ props.controls.colorRamps.selectedIdx
				+ '_' + JSON.stringify(state.rangeValues);
		}

		const minMax = props.raster
			? props.raster.stats
			: undefined;

		return (
			<div id="content" className="container-fluid">
				{!window.frameElement && props.title &&
					<h1>{props.title}</h1>
				}

				<div id="map-container">
					<Controls
						isPIDProvided={props.isPIDProvided}
						services={props.services}
						marginTop={5}
						controls={props.controls}
						playingMovie={props.playingMovie}
						increment={props.increment}
						playPauseMovie={props.playPauseMovie}
						delayChanged={props.delayChanged}
						handleServiceChange={props.serviceChanged}
						handleVarNameChange={props.variableChanged}
						handleDateChange={props.dateChanged}
						handleGammaChange={props.gammaChanged}
						handleElevationChange={props.elevationChanged}
						handleColorRampChange={props.colorRampChanged}
						isRangeFilterInputsActive={state.isRangeFilterInputsActive}
						handleRangeFilterInputsChange={this.updateRangeFilterInputsVisibility.bind(this)}
					/>

					<Timeserie
						isSites={props.isSites}
						isActive={state.isShowTimeserieActive}
						varName={props.controls.variables.selected}
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
							raster={props.raster}
							colorMaker={colorMaker}
							valueFilter={state.valueFilter}
							geoJson={props.countriesTopo.data}
							latLngBounds={latLngBounds}
							events={[
								{
									event: 'moveend',
									fn: leafletMap => {
										return {center: leafletMap.getCenter(), zoom: leafletMap.getZoom()};
									},
									callback: this.mapEventCallback.bind(this)
								},
								{
									event: 'click',
									fn: (leafletMap, e) => e,
									callback: this.timeserieMapClick.bind(this)
								}
							]}
						/>
					</div>
					<div id="legend" ref={div => this.legendDiv = div}>{
						getLegend
							? <Legend
								horizontal={false}
								canvasWidth={20}
								containerHeight={containerHeight}
								margin={7}
								getLegend={getLegend}
								legendId={legendId}
								legendText="Legend"
								decimals={3}
								useRangeValueFilters={true}
								rangeValues={state.rangeValues}
								rangeFilterChanged={this.rangeFilterChanged.bind(this)}
							/>
							: null
					}</div>

					<RangeFilterInput
						isActive={state.isRangeFilterInputsActive}
						minMax={minMax}
						rangeValues={state.rangeValues}
						rangeFilterChanged={debounce(this.rangeFilterChanged.bind(this), 500)}
					/>
				</div>

				<ReactSpinner isSites={props.isSites} show={showSpinner} />

			</div>
		);
	}
}

const getRasterXYFromLatLng = raster => {
	const tileHelper = getTileHelper(raster);

	return latlng => {
		const xy = tileHelper.lookupPixel(latlng.lng, latlng.lat);

		return xy
			? {
				x: Math.round(xy.x - 0.5),
				y: Math.round(xy.y - 0.5)
			}
			: undefined;
	}
};

const getLatLngBounds = (rasterFetchCount, initCenter, initZoom, raster) => {
	return rasterFetchCount === 1 && initCenter === undefined && initZoom === undefined && raster && raster.boundingBox
		? L.latLngBounds(
			L.latLng(raster.boundingBox.latMin, raster.boundingBox.lonMin),
			L.latLng(raster.boundingBox.latMax, raster.boundingBox.lonMax)
		)
		: undefined;
};

const formatData = dataToSave => {
	return {
		previewNetCDF: {
			params: {
				objId: dataToSave.objId,
				variable: dataToSave.variable
			}
		}
	}
};
