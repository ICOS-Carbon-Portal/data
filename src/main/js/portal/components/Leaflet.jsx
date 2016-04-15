import React, { Component, PropTypes } from 'react'
import ReactDOM from 'react-dom'
import L from 'leaflet'

class Leaflet extends Component {
	constructor(props){
		super(props)
	}

	componentDidMount() {
		const props = this.props;
		const maxZoom = 21;

		const baseMaps = this.getBaseMaps(maxZoom);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			center: [props.lat, props.lon],
			zoom: 6,
			layers: [baseMaps.Topographic],
			attributionControl: false
		});

		L.control.layers(baseMaps).addTo(map);

		L.marker([props.lat, props.lon]).addTo(map);
			// .bindPopup(`<b>Latitude: </b>${props.lat}<br /><b>Longitude: </b>${props.lon}`).openPopup();

		// map.on('click', this.onMapClick);
	}

	getBaseMaps(maxZoom){
		var topo = L.tileLayer('http://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: maxZoom
		});

		var image = L.tileLayer('http://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: maxZoom
		});

		var osm = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: maxZoom
		});

		var mapQuest = L.tileLayer("http://otile{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png", {
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

	// onMapClick(e) {
	// 	L.popup()
	// 		.setLatLng(e.latlng)
	// 		.setContent("You clicked the map at " + e.latlng.toString())
	// 		.openOn(this.map);
	// }

	render() {
		return (
			<div ref='map' className='map'></div>
		);
	}
}

export default Leaflet;