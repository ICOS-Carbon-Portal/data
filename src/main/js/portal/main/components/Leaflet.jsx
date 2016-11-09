import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as LCommon from '../../../common/main/maps/LeafletCommon';

class Leaflet extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount() {
		const props = this.props;
		const mapObjects = props.forMap;
		const maxZoom = 21;
		const baseMaps = LCommon.getBaseMaps(maxZoom);

		// this.debug("load", props);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			layers: [baseMaps.Topographic],
			attributionControl: false
		});

		const newMarkers = this.buildMarkers(mapObjects);
		map.addLayer(newMarkers);
		L.control.layers(baseMaps).addTo(map);

		this.setView(map, mapObjects);

		this.setState({map, markers: newMarkers});
	}

	componentWillReceiveProps(nextProps){
		if (this.props.forMap.length != nextProps.forMap.length){
			const map = this.state.map;
			const markers = this.state.markers;
			const mapObjects = nextProps.forMap;

			// this.debug("update", nextProps);

			map.removeLayer(markers);
			const newMarkers = this.buildMarkers(mapObjects);
			map.addLayer(newMarkers);

			this.setView(map, mapObjects);

			this.setState({map, markers: newMarkers});
		}
	}

	setView(map, mapObjects){
		const uniqueGeoms = getUniqueGeoms(mapObjects);

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

	buildMarkers(mapObjects){
		let markers = L.markerClusterGroup();

		mapObjects.forEach(mapObj => {
			if (mapObj.geom.lat && mapObj.geom.lon) {
				const marker = L.marker([mapObj.geom.lat, mapObj.geom.lon], {icon: LCommon.wdcggIcon});
				const popupHeader = "<b>" + mapObj.popup.stationName + "</b>";

				const popupTxt = Object.keys(mapObj.popup).filter(key => key != "stationName").map(key => {
					return "<div>" + mapObj.popup[key] + "</div>"
				}).join("");

				marker.bindPopup(popupHeader + popupTxt);
				markers.addLayer(marker);
			}
		});

		return markers;
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
			<div ref='map' className='map'></div>
		);
	}
}

function getUniqueGeoms(mapObjects){
	const geoms = mapObjects
		.filter(mo => mo.geom.lat && mo.geom.lon)
		.map(mo => mo.geom);
	let uniqueGeoms = [];

	geoms.forEach(geom => {
		if (uniqueGeoms.findIndex(ug => ug.lat == geom.lat && ug.lon == geom.lon) < 0) {
			uniqueGeoms.push(geom);
		}
	});

	return uniqueGeoms;
}

export default Leaflet;