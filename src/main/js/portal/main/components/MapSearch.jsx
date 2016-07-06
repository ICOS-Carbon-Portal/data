import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import config from '../config';
import { StationMultiFilter, EmptyFilter } from '../models/Filters'
import * as LCommon from '../models/LeafletCommon';
import {MapLegend} from '../models/MapLegend';

export default class MapSearch extends Component {
	constructor(props) {
		super(props);
		this.state = {
			stationsEnlarged: false
		}
	}

	componentDidMount() {
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
				self.bBox = layer.getLatLngs();
				self.applySpatialFilter(self.props);
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

		this.updateMap(this.props.stations, this.props.clustered);
	}

	componentWillReceiveProps(nextProps){
		//TODO Length comparison happens to work today, but proper comparison requires comparing values
		const newSpatialData = this.props.stations.selectedStations.length != nextProps.stations.selectedStations.length;
		const filterModeChanged = this.props.allStations != nextProps.allStations;
		const clusteringChanged = this.props.clustered != nextProps.clustered;

		if (filterModeChanged)
			this.applySpatialFilter(nextProps);
		else if (newSpatialData || clusteringChanged)
			this.updateMap(nextProps.stations, nextProps.clustered);
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		if(this.map){
			this.map.on('zoomend', null);
			this.map.on('draw:created', null);
		}
		this.map = null;
	}

	render(){
		return <span ref='map' className='map'></span>;
	}

	updateMap(stations, clustered){
		const map = this.map;
		const markers = this.state.markers;

		if (markers){
			map.removeLayer(markers);
		}
		const newMarkers = this.buildMarkers(stations, clustered, map.getZoom());
		map.addLayer(newMarkers);

		this.setState({markers: newMarkers, clustered});
	}

	buildMarkers(stations, clustered, zoomLevel){
		const markers = clustered
			? L.markerClusterGroup({maxClusterRadius: 50})
			: L.featureGroup();

		// First all excluded stations so they are placed underneath included
		stations.nonSelectedStationary.forEach(station => {
			const marker = L.circleMarker([station.lat, station.lon], LCommon.pointIconExcluded());
			marker.bindPopup(popupHeader(this, station.name, false));
			markers.addLayer(marker);
		});

		// Then included stations
		stations.selectedStations.forEach(station => {
			const marker = clustered
				? L.marker([station.lat, station.lon], {icon: LCommon.wdcggIcon})
				: L.circleMarker([station.lat, station.lon], LCommon.pointIcon());

			marker.bindPopup(popupHeader(this, station.name, true));
			markers.addLayer(marker);
		});

		return markers;
	}

	resetExtent(){
		this.props.filterUpdate(config.stationProp, new EmptyFilter());
		this.map.setView([0, 0], 1);
		this.bBox = null;
	}

	zoomTo(allStations){
		const stations = allStations
			? this.props.stations.stationaryStations.map(st => [st.lat, st.lon])
			: this.props.stations.selectedStations.map(st => [st.lat, st.lon]);

		if (stations.length > 0) {
			this.map.fitBounds(stations);
		}
	}

	removeStation(stationName){
		const props = this.props;
		const filteredStations = props.stations.selectedStations
			.filter(st => st.name != stationName);
		this.updateFilter(filteredStations, props);
	}

	applySpatialFilter(props){
		const bBox = this.bBox;
		if (bBox) {
			const filteredStations = props.stations.selectedStations
				.filter(st =>
					st.lat >= bBox[0].lat &&
					st.lat <= bBox[2].lat &&
					st.lon >= bBox[0].lng &&
					st.lon <= bBox[2].lng
				);
			this.updateFilter(filteredStations, props);
		}
	}

	updateFilter(stations, props){
		const finalStationsList = props.allStations
			? stations.concat(props.stations.mobileStations)
			: stations;
		const filter = new StationMultiFilter(finalStationsList.map(station => station.uri));
		props.filterUpdate(config.stationProp, filter);
	}
}

function popupHeader(self, stationName, remove){
	const div = document.createElement('div');

	const b = document.createElement('b');
	b.innerHTML = stationName;
	div.appendChild(b);

	div.appendChild(document.createElement('br'));

	if(remove){
		const btn = document.createElement('button');
		btn.className = 'btn btn-primary';
		btn.onclick = function () {
			self.removeStation(stationName);
			return false;
		};

		const span = document.createElement('span');
		span.className = 'glyphicon glyphicon-remove-circle';
		span.setAttribute('style', 'margin-right: 5px');


		const btnTxt = document.createElement('span');
		btnTxt.innerHTML = 'Remove';

		btn.appendChild(span);
		btn.appendChild(btnTxt);
		div.appendChild(btn);
	}

	return div;
}
