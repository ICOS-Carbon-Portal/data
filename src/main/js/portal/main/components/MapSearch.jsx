import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import config from '../config';
import { SpatialFilter, EmptyFilter } from '../models/Filters'
import * as LCommon from '../models/LeafletCommon';
import {MapLegend} from '../models/MapLegend';

class MapSearch extends Component {
	constructor(props) {
		super(props);
		this.state = {
			stationsEnlarged: false
		}
	}

	componentDidMount() {
		// console.log({componentDidMount: this.props});
		const props = this.props;
		const self = this;

		const maxZoom = 21;
		const baseMaps = LCommon.getBaseMaps(maxZoom);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			center: [0,0],
			zoom: 1,
			maxZoom: 14,
			layers: [baseMaps.Topographic],
			attributionControl: false,
			maxBounds: [[-90, -180],[90, 180]]
		});

		L.control.layers(baseMaps).addTo(map);

		const drawOptions = {
			draw: {
				polyline: false,
				polygon: false,
				circle: false,
				rectangle: true,
				marker: false
			}
		};

		L.drawLocal.draw.toolbar.buttons.rectangle = 'Filter stations by drawing a rectangle';

		const drawControl = new L.Control.Draw(drawOptions);
		map.addControl(drawControl);

		map.on('draw:created', e => {
			const layerType = e.layerType;
			const layer = e.layer;

			if (layerType === 'rectangle') {
				self.applySpatialFilter(self.props.allStations, layer.getLatLngs());
			}
		});

		map.addControl(new MapLegend());

		map.on('zoomend', e => {
			const zoomTrigger = 5;
			const markers = self.state.markers.getLayers();
			const currentZoom = map.getZoom();
			const stationsEnlarged = self.state.stationsEnlarged;

			if (!stationsEnlarged && currentZoom >= zoomTrigger){
				self.setState({stationsEnlarged: true});
				markers.forEach(marker => {
					marker.setRadius(marker.getRadius() * 2);
				});
			} else if (stationsEnlarged && currentZoom < zoomTrigger){
				self.setState({stationsEnlarged: false});
				markers.forEach(marker => {
					marker.setRadius(marker.getRadius() / 2);
				});
			}
		});

		this.setState({map, drawMap: true});
	}

	componentWillReceiveProps(nextProps){
		const drawMap = nextProps.spatial.forMap.length > 0 && this.state.drawMap;
		const newSpatialData = this.props.spatial.forMap.length != nextProps.spatial.forMap.length;
		const filterModeChanged = this.props.allStations != nextProps.allStations;
		const clusteringChanged = this.props.clustered != nextProps.clustered;

		if (drawMap || newSpatialData || clusteringChanged){
			this.setState({drawMap: false});
			this.updateMap(nextProps.spatial, nextProps.spatialFilter, nextProps.stationsAttributeFiltered, nextProps.clustered);
		} else if (filterModeChanged && this.state.bBox){
			this.applySpatialFilter(nextProps.allStations, this.state.bBox);
		}
	}

	updateMap(spatial, spatialFilter, stationsAttributeFiltered, cluster){
		const map = this.state.map;
		const markers = this.state.markers;

		if (markers){
			map.removeLayer(markers);
		}
		const newMarkers = this.buildMarkers(spatial, spatialFilter, stationsAttributeFiltered, cluster, map.getZoom());
		map.addLayer(newMarkers);

		this.setState({map, markers: newMarkers, clustered: cluster});
	}

	resetExtent(){
		const map = this.state.map;
		const props = this.props;

		props.filterUpdate(config.spatialStationProp, new EmptyFilter());
		map.setView([0, 0], 1);
		this.setState({bBox: null});
	}

	zoomTo(allStations){
		const map = this.state.map;
		const stations = allStations
			? this.props.spatial.stations.filter(st => st.lat && st.lon).map(st => [st.lat, st.lon])
			: this.props.spatial.forMap.filter(st => st.lat && st.lon).map(st => [st.lat, st.lon]);

		if (stations.length > 0) {
			map.fitBounds(stations);
		}
	}

	addRemoveStation(stationName, remove){
		const props = this.props;
		const allStations = props.allStations;
		const woSpatialExtent = props.spatial.woSpatialExtent;
		const forMap = props.spatial.forMap;
		const stations = props.spatial.stations;

		if(remove){
			const filteredStations = forMap.filter(st => st.name != stationName).concat(allStations
				? woSpatialExtent
				: []
			);
			const filter = new SpatialFilter(config.spatialStationProp, filteredStations);
			props.filterUpdate(config.spatialStationProp, filter);
		} else {
			const filteredStations = forMap.concat(stations.filter(st => st.name == stationName)).concat(woSpatialExtent);
			const filter = filteredStations.length == stations.length
				? new EmptyFilter()
				: new SpatialFilter(config.spatialStationProp, filteredStations);
			props.filterUpdate(config.spatialStationProp, filter);
		}
	}

	buildMarkers(spatial, spatialFilter, stationsAttributeFiltered, cluster, zoomLevel){
		let clusteredMarkers = L.markerClusterGroup({
			maxClusterRadius: 50
		});
		let markers = L.featureGroup();

		// console.log({spatial, spatialFilter, empty: spatialFilter.isEmpty(), stationsAttributeFiltered, cluster, zoomLevel});

		// First all excluded stations so they are placed underneath included
		spatial.stations.forEach(station => {
			if (station.lat && station.lon && spatial.forMap.findIndex(ex => ex.name == station.name) < 0) {
				const marker = cluster
					? L.circleMarker([station.lat, station.lon], LCommon.pointIconExcluded())
					: L.circleMarker([station.lat, station.lon], LCommon.pointIconExcluded());

				marker.bindPopup(popupHeader(this, station.name));

				if (cluster) {
					clusteredMarkers.addLayer(marker);
				} else {
					markers.addLayer(marker);
				}
			}
		});

		// Then included stations
		spatial.forMap.forEach(station => {
			if (station.lat && station.lon) {
				const marker = cluster
					? L.marker([station.lat, station.lon], {icon: LCommon.wdcggIcon})
					: L.circleMarker([station.lat, station.lon], LCommon.pointIcon());

				marker.bindPopup(popupHeader(this, station.name, 'remove'));

				if (cluster) {
					clusteredMarkers.addLayer(marker);
				} else {
					markers.addLayer(marker);
				}
			}
		});

		return cluster
			? clusteredMarkers
			: markers;
	}

	applySpatialFilter(allStations, bBox){
		if (bBox) {
			this.setState({bBox});

			const props = this.props;
			const filteredStations = props.spatial.stations.filter(st =>
				st.lat >= bBox[0].lat
				&& st.lat <= bBox[2].lat
				&& st.lon >= bBox[0].lng
				&& st.lon <= bBox[2].lng
			).concat(allStations
				? props.spatial.woSpatialExtent
				: []
			);

			const filter = new SpatialFilter(config.spatialStationProp, filteredStations);
			props.filterUpdate(config.spatialStationProp, filter);
		}
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		this.map = null;
	}

	render(){
		return <span ref='map' className='map'></span>;
	}
}

function popupHeader(self, stationName, btnType){
	const div = document.createElement('div');

	const b = document.createElement('b');
	b.innerHTML = stationName;
	div.appendChild(b);

	if(btnType) {
		const className = btnType == 'remove'
			? 'glyphicon glyphicon-remove-circle'
			: 'glyphicon glyphicon-ok-circle';

		div.appendChild(document.createElement('br'));

		const btn = document.createElement('button');
		btn.className = 'btn btn-primary';
		btn.onclick = function () {
			self.addRemoveStation(stationName, btnType == 'remove');
			return false;
		};

		const span = document.createElement('span');
		span.className = className;
		span.setAttribute('style', 'margin-right: 5px');


		const btnTxt = document.createElement('span');
		btnTxt.innerHTML = btnType == 'remove' ? 'Remove' : 'Add';

		btn.appendChild(span);
		btn.appendChild(btnTxt);
		div.appendChild(btn);
	}

	return div;
}

export default MapSearch;