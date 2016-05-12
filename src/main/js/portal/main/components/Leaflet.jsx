import React, { Component, PropTypes } from 'react'
import ReactDOM from 'react-dom'

class Leaflet extends Component {
	constructor(props){
		super(props)
	}

	componentDidMount() {
		const props = this.props;
		console.log({componentDidMount: props});
		const maxZoom = 21;

		const baseMaps = this.getBaseMaps(maxZoom);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			center: [props.geoms[0].lat, props.geoms[0].lon],
			zoom: 6,
			layers: [baseMaps.Topographic],
			attributionControl: false
		});

		const newMarkers = this.buildMarkers(props.geoms);
		console.log({newMarkers});

		map.addLayer(newMarkers.markers);

		if (newMarkers.fitBounds) {
			map.fitBounds(props.geoms.map(geom => [geom.lat, geom.lon]));
		}

		L.control.layers(baseMaps).addTo(map);

		this.setState({map, markers: newMarkers.markers});
	}

	componentWillReceiveProps(nextProps){
		console.log({componentWillReceiveProps: this.props, nextProps, map: this.state.map, markers: this.state.markers});

		if (this.props.geoms.length != nextProps.geoms.length){
			const map = this.state.map;
			const markers = this.state.markers;

			map.removeLayer(markers);
			const newMarkers = this.buildMarkers(nextProps.geoms);
			map.addLayer(newMarkers.markers);

			if (newMarkers.fitBounds) {
				map.fitBounds(nextProps.geoms.map(geom => [geom.lat, geom.lon]));
			} else {
				map.setView(nextProps.geoms[0], 6);
			}

			this.setState({map, markers: newMarkers.markers});
		}
	}

	buildMarkers(geoms){
		let markers = L.markerClusterGroup();
		let positions = [];

		geoms.forEach(geom => {
			markers.addLayer(L.marker([geom.lat, geom.lon]));

			if (positions.findIndex(pos => pos[0] == geom.lat && pos[1] == geom.lon) < 0) {
				positions.push([geom.lat, geom.lon]);
			}
		});

		return {
			markers,
			fitBounds: positions.length > 1
		};
	}

	// componentWillUpdate(nextProps, nextState){
	// 	console.log({componentWillUpdate: this.props, nextProps, nextState});
	// }

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