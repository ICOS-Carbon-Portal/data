import React, { Component, PropTypes } from 'react'
import ReactDOM from 'react-dom'

class Leaflet extends Component {
	constructor(props){
		super(props)
	}

	componentDidMount() {
		const props = this.props;
		const geoms = this.filterGeom(props.geoms);
		const maxZoom = 21;
		const baseMaps = this.getBaseMaps(maxZoom);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			center: [geoms[0].lat, geoms[0].lon],
			zoom: 6,
			layers: [baseMaps.Topographic],
			attributionControl: false
		});

		const newMarkers = this.buildMarkers(geoms, props.labels);

		map.addLayer(newMarkers.markers);

		if (newMarkers.fitBounds) {
			map.fitBounds(geoms.map(geom => [lat, lon]));
		}

		L.control.layers(baseMaps).addTo(map);

		this.setState({map, markers: newMarkers.markers});
	}

	componentWillReceiveProps(nextProps){
		if (this.props.geoms.length != nextProps.geoms.length){
			const map = this.state.map;
			const markers = this.state.markers;
			const geoms = this.filterGeom(nextProps.geoms);

			map.removeLayer(markers);
			const newMarkers = this.buildMarkers(geoms, nextProps.labels);

			map.addLayer(newMarkers.markers);

			if (newMarkers.fitBounds) {
				map.fitBounds(geoms.map(geom => [geom.lat, geom.lon]));
			} else {
				map.setView(geoms[0], 6);
			}

			this.setState({map, markers: newMarkers.markers});
		}
	}

	filterGeom(geom){
		return geom.map(g =>
			g.lat && g.lon
				? {lat: g.lat, lon: g.lon}
				: {lat: 0, lon: 0}
		);
	}

	buildMarkers(geoms, labels){
		let markers = L.markerClusterGroup();
		let positions = [];

		geoms.forEach((geom, idx) => {
			const marker = L.marker([geom.lat, geom.lon]);
			const popUpTxt = geom.lat && geom.lon
				? "<b>" + labels[idx] + "</b>"
				: "<b>" + labels[idx] + "</b><br><p>Position is unknown!</p>";
			marker.bindPopup(popUpTxt);
			markers.addLayer(marker);

			if (positions.findIndex(pos => pos[0] == geom.lat && pos[1] == geom.lon) < 0) {
				positions.push([geom.lat, geom.lon]);
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

	render() {
		return (
			<div ref='map' className='map'></div>
		);
	}
}

export default Leaflet;