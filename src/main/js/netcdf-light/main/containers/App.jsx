import React, { Component } from 'react'
import ReactDOM from 'react-dom';
import { connect } from 'react-redux'
import NetCDFMap from 'icos-cp-netcdfmap';
import Legend from 'icos-cp-legend';
import {AnimatedToasters} from 'icos-cp-toaster';
import {COUNTRIES_FETCHED, RASTER_FETCHED}from '../actions';

const minHeight = 300;

class App extends Component {
	constructor(props){
		super(props);
		this.state = {
			gotCountries: false,
			gotRaster: false,
			showSpinner: () => !(this.state.gotCountries && this.state.gotRaster),
			height: null
		};
		this.legendDiv = undefined;
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
			this.setState({gotRaster: true});
		}
	}

	updateDimensions(){
		this.setState({height: this.legendDiv.clientHeight});
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.updateDimensions.bind(this));
	}

	render() {
		const state = this.state;
		const props = this.props;

		const colorMaker = props.colorMaker ? props.colorMaker.makeColor.bind(props.colorMaker) : null;
		const getLegend = props.colorMaker ? props.colorMaker.getLegend.bind(props.colorMaker) : null;

		const legendId = props.raster
			? props.raster.id + '_' + props.params.get('gamma')
			: "";

		const containerHeight = state.height < minHeight ? minHeight : state.height;
		console.log({props});

		return (
			<div id="content">

				<AnimatedToasters
					autoCloseDelay={5000}
					fadeInTime={100}
					fadeOutTime={400}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div id="map">
					<NetCDFMap
						mapOptions={{
							zoom: 2,
							center: [13, 0]
						}}
						raster={props.raster}
						colorMaker={colorMaker}
						geoJson={props.countriesTopo}
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

function getLatLngBounds(services, lastChangedControl, raster, status){
	return status === RASTER_FETCHED && services && lastChangedControl == "services"
		? L.latLngBounds(
			L.latLng(raster.boundingBox.latMin, raster.boundingBox.lonMin),
			L.latLng(raster.boundingBox.latMax, raster.boundingBox.lonMax)
		)
		: null;
}

function stateToProps(state){
	return Object.assign({}, state);
}

export default connect(stateToProps)(App);
