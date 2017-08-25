import React, { Component } from 'react';
import NetCDFMap from 'icos-cp-netcdfmap';
import Legend from 'icos-cp-legend';
import Controls from './Controls.jsx';
import {throttle} from 'icos-cp-utils';


const minHeight = 300;

export default class Map extends Component {
	constructor(props){
		super(props);
		this.state = {
			countriesTs: Date.now(),
			rasterTs: Date.now(),
			height: null
		};

		this.hightUpdater = throttle(this.updateHight.bind(this));
		window.addEventListener("resize", this.hightUpdater);

		this.ctrls = {
			varName: props.initSearchParams.varName,
			date: props.initSearchParams.date,
			gamma: props.initSearchParams.gamma,
			elevation: props.initSearchParams.elevation
		};

		this.centerZoom = centerZoom2obj(props.initSearchParams.center, props.initSearchParams.zoom);
	}

	componentDidMount(){
		this.updateHight();
	}

	handleVarNameChange(newIdx){
		const {controls, variableChanged} = this.props;
		this.ctrls.varName = controls.variables.values[newIdx];
		this.updateURL();
		variableChanged(newIdx);
	}

	handleDateChange(newIdx){
		const {controls, dateChanged} = this.props;
		this.ctrls.date = controls.dates.values[newIdx];
		this.updateURL();
		dateChanged(newIdx);
	}

	handleGammaChange(newIdx){
		const {controls, gammaChanged} = this.props;
		this.ctrls.gamma = controls.gammas.values[newIdx];
		this.updateURL();
		gammaChanged(newIdx);
	}

	handleElevationChange(newIdx){
		const {controls, elevationChanged} = this.props;
		this.ctrls.elevation = controls.elevations.values[newIdx];
		this.updateURL();
		elevationChanged(newIdx);
	}

	updateURL(centerZoom){
		const {varName, date, gamma, elevation} = this.ctrls;

		const varNameParam = varName ? `varName=${varName}` : undefined;
		const dateParam = date ? `date=${date}` : undefined;
		const gammaParam = gamma ? `gamma=${gamma}` : undefined;
		const elevationParam = elevation ? `elevation=${elevation}` : undefined;
		const center = centerZoom && centerZoom.center
			? `center=${centerZoom.center.lat.toFixed(5)},${centerZoom.center.lng.toFixed(5)}`
			: undefined;
		const zoom = centerZoom && centerZoom.zoom ? `zoom=${centerZoom.zoom}` : undefined;

		const searchParams = [varNameParam, dateParam, gammaParam, elevationParam, center, zoom];
		const newURL = location.origin + location.pathname + '?' + searchParams.filter(sp => sp).join('&');

		history.pushState({urlPath: newURL}, "", newURL);
		//Let calling page (through iframe) know what current url is
		window.top.postMessage(newURL, '*');
	}

	updateHight(){
		this.setState({height: this.legendDiv.clientHeight});
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.hightUpdater);
	}

	mapEventCallback(event, payload){
		if (event === 'moveend') {
			this.updateURL(payload);
		}
	}

	render() {
		const state = this.state;
		const props = this.props;

		const colorMaker = props.colorMaker ? props.colorMaker.makeColor.bind(props.colorMaker) : null;
		const getLegend = props.colorMaker ? props.colorMaker.getLegend.bind(props.colorMaker) : null;
		const legendId = props.raster.data
			? props.raster.data.id + '_' + state.gamma
			: "";

		const containerHeight = state.height < minHeight ? minHeight : state.height;
		const showSpinner = isSpinnerVisible(props.countriesTopo.ts, state.countriesTs, props.raster.ts, state.rasterTs);
		// console.log({props, state, showSpinner});

		return (
			<div id="content" className="container-fluid">
				<Controls
					marginTop={5}
					controls={props.controls}
					playingMovie={props.playingMovie}
					increment={props.increment}
					playPauseMovie={props.playPauseMovie}
					delayChanged={props.delayChanged}
					handleVarNameChange={this.handleVarNameChange.bind(this)}
					handleDateChange={this.handleDateChange.bind(this)}
					handleGammaChange={this.handleGammaChange.bind(this)}
					handleElevationChange={this.handleElevationChange.bind(this)}
				/>

				<div id="map">
					<NetCDFMap
						mapOptions={{
							center: [13, 0],
							zoom: 2
						}}
						raster={props.raster.data}
						colorMaker={colorMaker}
						geoJson={props.countriesTopo.data}
						centerZoom={this.centerZoom}
						events={[
							{
								event: 'moveend',
								fn: leafletMap => {return {center: leafletMap.getCenter(), zoom: leafletMap.getZoom()};},
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

const centerZoom2str = centerZoom => {
	return '&center=' + centerZoom.center.lat + ',' + centerZoom.center.lng + '&zoom=' + centerZoom.zoom;
};

const centerZoom2obj = (center, zoom) => {
	if (center && zoom){
		return {center: center.split(','), zoom};
	} else {
		return null;
	}
};

const isSpinnerVisible = (fetchedCountriesTs, stateCountriesTs, fetchedRasterTs, stateRasterTs) => {
	return stateCountriesTs > fetchedCountriesTs && stateRasterTs > fetchedRasterTs;
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
}

