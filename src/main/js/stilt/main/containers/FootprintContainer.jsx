import React, { Component } from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import colorMaker from '../models/colorMaker';
import NetCDFMap from 'icos-cp-netcdfmap';
import Legend from 'icos-cp-legend';
import {getLegend} from '../models/colorMaker';
import {incrementIfNeeded} from '../actions';
import {pointIcon, polygonMask} from 'icos-cp-leaflet-common';

const containerHeight = 400;
const legendWidth = 120;

class FootprintContainer extends Component {
	constructor(props) {
		super(props);
		this.lastSelectedStation = {id: null};
	}

	componentDidUpdate(prevProps){
		this.lastSelectedStation = prevProps.selectedStation || this.lastSelectedStation;
	}

	render(){
		const props = this.props;
		return(
			<div ref="container" style={{display:'flex'}}>
				<div style={{height: containerHeight, flex: 100}}>
					<NetCDFMap
						mapHeight={containerHeight}
						mapOptions={{
							maxBounds: [[28, -20],[78, 40]],
							center: [53, 10],
							zoom: 3
						}}
						geoJson={props.countriesTopo}
						raster={props.raster}
						overlay={getMarkers(props.selectedStation, "Station")}
						latLngBounds={getLatLngBounds(props.selectedStation, this.lastSelectedStation)}
						reset={doReset(props.selectedStation, this.lastSelectedStation, props.raster)}
						colorMaker={colorMaker}
						renderCompleted={props.renderCompleted}
						mask={polygonMask}
					/>
				</div>
				<div style={{flex: legendWidth + 'px', minWidth: legendWidth}}>
					<Legend
						horizontal={false}
						canvasWidth={20}
						containerHeight={containerHeight}
						margin={7}
						getLegend={getLegend}
						legendId={props.raster ? props.raster.id : ""}
						legendText="surface influence [ppm / (&mu;mol / m&sup2;s)]"
					/>
				</div>
			</div>
		);
	}
}

function getMarkers(selectedStation, label){
	const markers = {
		label,
		features: []
	};

	if (selectedStation){
		markers.features.push(L.circleMarker([selectedStation.lat, selectedStation.lon], pointIcon(5, 1, 'rgb(85,131,255)', 'black')));
	}

	return markers;
}

function doReset(selectedStation, lastSelectedStation, raster){
	return !!(selectedStation && selectedStation.id != lastSelectedStation.id && !raster);
}

function getLatLngBounds(selectedStation, lastSelectedStation){
	return selectedStation && selectedStation.id != lastSelectedStation.id
		? L.latLngBounds([L.latLng(selectedStation.lat, selectedStation.lon)])
		: null;
}

function stateToProps(state){
	return Object.assign({},
		copyprops(state, ['countriesTopo', 'raster', 'selectedStation'])
	);
}

function dispatchToProps(dispatch){
	return {
		renderCompleted: () => dispatch(incrementIfNeeded)
	};
}

export default connect(stateToProps, dispatchToProps)(FootprintContainer);

