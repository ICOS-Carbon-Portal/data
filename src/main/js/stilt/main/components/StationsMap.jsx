import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as LCommon from '../../../common/main/maps/LeafletCommon.js';

class StationsMap extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount() {
		const props = this.props;
		const maxZoom = 21;
		const baseMaps = LCommon.getBaseMaps(maxZoom);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			layers: [baseMaps.Topographic],
			attributionControl: false
		});

		L.control.layers(baseMaps).addTo(map);

		this.setState({map});
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;

		if (nextProps.stations.length > 0 && prevProps.stations.length != nextProps.stations.length) {
			const map = this.state.map;
			const newMarkers = this.buildMarkers(nextProps.stations);
			map.addLayer(newMarkers);

			this.setView(map, nextProps.stations);
		}
	}

	buildMarkers(stations){
		const markers = L.featureGroup();

		stations.forEach(station => {
			const marker = L.circleMarker([station.lat, station.lon], LCommon.pointIcon());
			marker.bindPopup(popupHeader(station.name));
			markers.addLayer(marker);
		});

		return markers;
	}

	setView(map, stations){
		const uniqueGeoms = getUniqueGeoms(stations);

		if (uniqueGeoms.length == 0){
			map.setView([0, 0], 1);
		} else if (uniqueGeoms.length == 1){
			map.setView([uniqueGeoms[0].lat, uniqueGeoms[0].lon], 6);
		} else {
			map.fitBounds(uniqueGeoms.map(geom => [geom.lat, geom.lon]));
		}
	}

	debug(sender, props){
		console.log({sender, props});
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		this.map.off('click', this.onMapClick);
		this.map = null;
	}

	render() {
		return (
			<div ref='map' style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>
		);
	}
}

function getUniqueGeoms(stations){
	let uniqueGeoms = [];

	stations.forEach(station => {
		if (uniqueGeoms.findIndex(ug => ug.lat == station.lat && ug.lon == station.lon) < 0) {
			uniqueGeoms.push(station);
		}
	});

	return uniqueGeoms;
}

function popupHeader(stationName){
	const div = document.createElement('div');

	const b = document.createElement('b');
	b.innerHTML = stationName;
	div.appendChild(b);
	div.appendChild(document.createElement('br'));

	return div;
}

export default StationsMap;