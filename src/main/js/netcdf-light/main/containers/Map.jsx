import React, { Component } from 'react'
import ReactDOM from 'react-dom';
import { connect } from 'react-redux'
import NetCDFMap from 'icos-cp-netcdfmap';
import Legend from 'icos-cp-legend';
import ColorMaker from '../models/ColorMaker';
import {getRasterId, getBaseSearch, COUNTRIES_FETCHED, RASTER_FETCHED}from '../actions';
import {GammaCtrl} from '../controls/GammaCtrl';

const minHeight = 300;

class Map extends Component {
	constructor(props){
		super(props);
		this.state = {
			gotCountries: false,
			gotRaster: false,
			showSpinner: () => !(this.state.gotCountries && this.state.gotRaster),
			height: null,
			gamma: props.params.get('gamma'),
			colorMaker: undefined
		};

		this.legendDiv = undefined;
		this.hostPath = location.origin + location.pathname;
		this.centerZoom = centerZoom2obj(props.params);
	}

	componentDidMount(){
		window.addEventListener("resize", this.updateDimensions.bind(this));
		this.legendDiv = ReactDOM.findDOMNode(this.refs.legend);
		this.updateDimensions();
	}

	componentWillReceiveProps(nextProps){
		if (nextProps.event === COUNTRIES_FETCHED) {
			this.setState({gotCountries: true});
		} else if (nextProps.event === RASTER_FETCHED) {
			this.setState({
				gotRaster: true,
				colorMaker: new ColorMaker(nextProps.raster.stats.min, nextProps.raster.stats.max, this.state.gamma)
			});
		}
	}

	gammaChanged(gamma){
		const raster = this.props.raster;
		raster.id = getRasterId(this.props.params, gamma);
		this.updateHistory(gamma);

		this.setState({
			gamma,
			colorMaker: new ColorMaker(raster.stats.min, raster.stats.max, gamma)
		});
	}

	updateDimensions(){
		this.setState({height: this.legendDiv.clientHeight});
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.updateDimensions.bind(this));
	}

	mapEventCallbacks(event, payload){
		if (event === 'moveend') {
			// console.log({payload});
			this.centerZoom = payload;
			this.updateHistory(this.state.gamma);
		}
	}

	updateHistory(gamma){
		const params = this.props.params;
		const baseUrl = this.hostPath;
		const baseSearch = getBaseSearch(params);
		const newUrl = baseUrl + '?' + baseSearch
			+ '&gamma=' + (gamma ? gamma : params.get('gamma'))
			+ (this.centerZoom ? centerZoom2str(this.centerZoom) : '');
		// console.log({baseUrl, baseSearch, newUrl});

		history.pushState({urlPath: newUrl}, "", newUrl);
	}

	render() {
		const state = this.state;
		const props = this.props;

		// const latLngBounds = props.params.has('bbox')
		// 	? getLatLngBounds(props.params.get('bbox'))
		// 	: null;

		const colorMaker = state.colorMaker ? state.colorMaker.makeColor.bind(state.colorMaker) : null;
		const getLegend = state.colorMaker ? state.colorMaker.getLegend.bind(state.colorMaker) : null;
		const gammaCtrl = state.gamma
			? new GammaCtrl({gamma: state.gamma, gammaChanged: this.gammaChanged.bind(this)})
			: null;

		const legendId = props.raster
			? props.raster.id + '_' + state.gamma
			: "";

		const containerHeight = state.height < minHeight ? minHeight : state.height;
		// console.log({mapProps: props});

		return (
			<div id="content">

				<div id="map">
					<NetCDFMap
						ref="netcdfmap"
						mapOptions={{
							zoom: 2,
							center: [13, 0]
						}}
						raster={props.raster}
						colorMaker={colorMaker}
						geoJson={props.countriesTopo}
						centerZoom={this.centerZoom}
						controls={[gammaCtrl]}
						events={[
							{
								event: 'moveend',
								fn: leafletMap => {return {center: leafletMap.getCenter(), zoom: leafletMap.getZoom()};},
								callback: this.mapEventCallbacks.bind(this)
							}
						]}
					/>
				</div>
				<div id="legend" ref="legend">{
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

				<Spinner show={state.showSpinner()} />

			</div>
		);
	}
}

const centerZoom2str = centerZoom => {
	return '&center=' + centerZoom.center.lat + ',' + centerZoom.center.lng + '&zoom=' + centerZoom.zoom;
};

const centerZoom2obj = params => {
	if (params.has('center') && params.has('zoom')){
		return {center: params.get('center').split(','), zoom: params.get('zoom')};
	} else {
		return null;
	}
};

const Spinner = props => {
	return props.show
		? <div id="cp-spinner">
			<div className="bounce1"></div>
			<div className="bounce2"></div>
			<div></div>
			<span>Carbon</span>
			<span>Portal</span>
		</div>
		: null;
}

const stateToProps = state => {
	return Object.assign({}, state);
};

export default connect(stateToProps)(Map);
