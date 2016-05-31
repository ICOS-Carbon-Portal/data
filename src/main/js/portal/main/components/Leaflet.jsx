import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

class Leaflet extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount() {
		const props = this.props;
		const mapObjects = props.forMap;
		const maxZoom = 21;
		const baseMaps = this.getBaseMaps(maxZoom);

		// this.debug("load", props);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			center: [mapObjects[0].geom.lat, mapObjects[0].geom.lon],
			zoom: 6,
			layers: [baseMaps.Topographic],
			attributionControl: false
		});

		const newMarkers = this.buildMarkers(mapObjects);

		map.addLayer(newMarkers.markers);

		if (newMarkers.fitBounds) {
			map.fitBounds(geoms.map(geom => [geom.lat, geom.lon]));
		}

		L.control.layers(baseMaps).addTo(map);

		this.setState({map, markers: newMarkers.markers});
	}

	componentWillReceiveProps(nextProps){
		if (this.props.forMap.length != nextProps.forMap.length){
			const map = this.state.map;
			const markers = this.state.markers;
			const mapObjects = nextProps.forMap;

			// this.debug("update", nextProps);

			map.removeLayer(markers);
			const newMarkers = this.buildMarkers(mapObjects);

			map.addLayer(newMarkers.markers);

			if (newMarkers.fitBounds) {
				map.fitBounds(mapObjects.map(mapObj => [mapObj.geom.lat, mapObj.geom.lon]));
			} else {
				map.setView([mapObjects[0].geom.lat, mapObjects[0].geom.lon], 6);
			}

			this.setState({map, markers: newMarkers.markers});
		}
	}

	debug(sender, props){
		console.log({sender, props});
	}

	buildMarkers(mapObjects){
		let markers = L.markerClusterGroup();
		let positions = [];
		let wdcggIcon = L.icon({
			iconUrl: 'https://static.icos-cp.eu/images/tmp/wdcgg.svg',
			iconSize:     [23, 28],
			iconAnchor:   [12, 28],
			popupAnchor:  [0, -23]
		});

		// console.log({mapObjects, props: this.props, state: this.state});

		mapObjects.forEach(mapObj => {
			if (mapObj.geom.lat && mapObj.geom.lon) {
				const marker = L.marker([mapObj.geom.lat, mapObj.geom.lon], {icon: wdcggIcon});
				const popupHeader = "<b>" + mapObj.popup.stationName + "</b>";

				const popupTxt = Object.keys(mapObj.popup).filter(key => key != "stationName").map(key => {
					return "<div>" + mapObj.popup[key] + "</div>"
				}).join("");

				marker.bindPopup(popupHeader + popupTxt);
				markers.addLayer(marker);

				if (positions.findIndex(pos => pos[0] == mapObj.geom.lat && pos[1] == mapObj.geom.lon) < 0) {
					positions.push([mapObj.geom.lat, mapObj.geom.lon]);
				}
			}
		});

		return {
			markers,
			fitBounds: positions.length > 1
		};
	}

	shouldComponentUpdate(){
		return false;
	}

	getBaseMaps(maxZoom){
		var topo = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: maxZoom
		});

		var image = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: maxZoom
		});

		var osm = L.tileLayer(window.location.protocol + "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: maxZoom
		});

		var mapQuest = L.tileLayer(window.location.protocol + "//otile{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png", {
			maxZoom: maxZoom,
			subdomains: "1234"
		});

		return {
			"Topographic": topo,
			"Satellite": image,
			"OSM": osm,
			"MapQuest": mapQuest
		};
	}

	componentWillUnmount() {
		this.map.off('click', this.onMapClick);
		this.map = null;
	}

	render() {
		return (
			<div ref='map' className='map'></div>
		);
	}
}

export default Leaflet;