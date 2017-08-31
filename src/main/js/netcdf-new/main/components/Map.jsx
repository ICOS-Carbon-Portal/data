import React, { Component } from 'react';
import NetCDFMap from 'icos-cp-netcdfmap';
import Legend from 'icos-cp-legend';
import Controls from './Controls.jsx';
import {throttle} from 'icos-cp-utils';
import {defaultGamma} from '../store';


const minHeight = 300;

export default class Map extends Component {
	constructor(props){
		super(props);
		this.state = {
			height: null
		};

		this.countriesTs = Date.now();
		this.center = props.initSearchParams.center && props.initSearchParams.center.split(',') || [52.5, 10];
		this.zoom = props.initSearchParams.zoom || 2;

		this.hightUpdater = throttle(this.updateHight.bind(this));
		window.addEventListener("resize", this.hightUpdater);
	}

	componentDidMount(){
		this.updateHight();
	}

	updateURL(){
		if (this.props.rasterFetchCount > 0) {
			const {dates, elevations, gammas, variables} = this.props.controls;
			const dateParam = dates.selectedIdx > 0 && dates.selected ? `date=${dates.selected}` : undefined;
			const elevationParam = elevations.selectedIdx > 0 && elevations.selected ? `elevation=${elevations.selected}` : undefined;
			const gammaParam = gammas.selected !== defaultGamma ? `gamma=${gammas.selected}` : undefined;
			const varNameParam = variables.selectedIdx > 0 && variables.selected ? `varName=${variables.selected}` : undefined;
			const center = this.center ? `center=${this.center}` : undefined;
			const zoom = this.zoom ? `zoom=${this.zoom}` : undefined;

			const searchParams = [varNameParam, dateParam, gammaParam, elevationParam, center, zoom];
			const newSearch = searchParams.filter(sp => sp).join('&');

			if (newSearch) {
				const newURL = location.origin + location.pathname + '?' + newSearch;

				history.pushState({urlPath: newURL}, "", newURL);
				//Let calling page (through iframe) know what current url is
				window.top.postMessage(newURL, '*');
			}
		}
	}

	updateHight(){
		this.setState({height: this.legendDiv.clientHeight});
	}

	componentDidUpdate(){
		this.updateURL();
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.hightUpdater);
	}

	mapEventCallback(event, payload){
		if (event === 'moveend' && payload && payload.center && payload.zoom) {
			const decimals = 5;
			this.center = [payload.center.lat.toFixed(decimals), payload.center.lng.toFixed(decimals)];
			this.zoom = payload.zoom;
			this.updateURL();
		}
	}

	render() {
		const state = this.state;
		const props = this.props;

		const showSpinner = props.countriesTopo.ts > this.countriesTs && props.rasterFetchCount === 0;
		const colorMaker = props.colorMaker ? props.colorMaker.makeColor.bind(props.colorMaker) : null;
		const getLegend = props.colorMaker ? props.colorMaker.getLegend.bind(props.colorMaker) : null;
		const legendId = props.raster
			? props.raster.id + '_' + state.gamma
			: "";
		const latLngBounds = getLatLngBounds(
			props.rasterFetchCount,
			props.initSearchParams.center,
			props.initSearchParams.zoom,
			props.raster
		);
		const containerHeight = state.height < minHeight ? minHeight : state.height;

		return (
			<div id="content" className="container-fluid">
				<Controls
					marginTop={5}
					controls={props.controls}
					playingMovie={props.playingMovie}
					increment={props.increment}
					playPauseMovie={props.playPauseMovie}
					delayChanged={props.delayChanged}
					handleVarNameChange={props.variableChanged}
					handleDateChange={props.dateChanged}
					handleGammaChange={props.gammaChanged}
					handleElevationChange={props.elevationChanged}
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
						geoJson={props.countriesTopo.data}
						latLngBounds={latLngBounds}
						events={[
							{
								event: 'moveend',
								fn: leafletMap => {
									return {center: leafletMap.getCenter(), zoom: leafletMap.getZoom()};
								},
								callback: this.mapEventCallback.bind(this)
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
						/>
						: null
				}</div>

				<Spinner show={showSpinner} />

			</div>
		);
	}
}

const getLatLngBounds = (rasterFetchCount, initCenter, initZoom, raster) => {
	return rasterFetchCount === 1 && initCenter === undefined && initZoom === undefined && raster && raster.boundingBox
		? L.latLngBounds(
			L.latLng(raster.boundingBox.latMin, raster.boundingBox.lonMin),
			L.latLng(raster.boundingBox.latMax, raster.boundingBox.lonMax)
		)
		: undefined;
};

const Spinner = props => {
	return props.show
		? <div id="cp-spinner">
			<div className="bounce1" />
			<div className="bounce2" />
			<div />
			<span>Carbon</span>
			<span>Portal</span>
		</div>
		: null;
};
