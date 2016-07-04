import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import config from '../config';
import { SpatialFilter, EmptyFilter } from '../models/Filters'
import * as LCommon from '../models/LeafletCommon';
import {MapLegend} from '../models/MapLegend';
import {isMobile} from '../models/StationsInfo';

export default class MapSearch extends Component {
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
		const drawMap = nextProps.stations.selectedCount > 0 && this.state.drawMap;
		const newSpatialData = this.props.stations.selectedCount != nextProps.stations.selectedCount;
		const filterModeChanged = this.props.allStations != nextProps.allStations;
		const clusteringChanged = this.props.clustered != nextProps.clustered;

		if (drawMap || newSpatialData || clusteringChanged){
			this.setState({drawMap: false});
			this.updateMap(nextProps.stations, nextProps.spatialFilter, nextProps.stationsAttributeFiltered, nextProps.clustered);
		} else if (filterModeChanged && this.state.bBox){
			this.applySpatialFilter(nextProps.allStations, this.state.bBox);
		}
	}

	updateMap(stations, spatialFilter, stationsAttributeFiltered, cluster){
		const map = this.state.map;
		const markers = this.state.markers;

		if (markers){
			map.removeLayer(markers);
		}
		const newMarkers = this.buildMarkers(stations, spatialFilter, stationsAttributeFiltered, cluster, map.getZoom());
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
			? this.props.stations.stationaryStations.map(st => [st.lat, st.lon])
			: this.props.stations.selected.filter(st => !isMobile(st)).map(st => [st.lat, st.lon]);

		if (stations.length > 0) {
			map.fitBounds(stations);
		}
	}

	addRemoveStation(stationName, remove){
		const props = this.props;
		const allStations = props.allStations;
		const woSpatialExtent = props.stations.mobileStations;
		const forMap = props.stations.selectedStations;
		const stations = props.stations.allStations;

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

	buildMarkers(stations, spatialFilter, stationsAttributeFiltered, cluster, zoomLevel){
		const markers = cluster
			? L.markerClusterGroup({maxClusterRadius: 50})
			: L.featureGroup();

		// First all excluded stations so they are placed underneath included
		stations.stationaryStations.forEach(station => {
			if (stations.isSelected(station.uri)) {
				const marker = L.circleMarker([station.lat, station.lon], LCommon.pointIconExcluded());
				marker.bindPopup(popupHeader(this, station.name));
				markers.addLayer(marker);
			}
		});

		// Then included stations
		stations.selectedStations.forEach(station => {
			const marker = cluster
				? L.marker([station.lat, station.lon], {icon: LCommon.wdcggIcon})
				: L.circleMarker([station.lat, station.lon], LCommon.pointIcon());

			marker.bindPopup(popupHeader(this, station.name, 'remove'));
			markers.addLayer(marker);
		});

		return markers;
	}

	applySpatialFilter(allStations, bBox){
		if (bBox) {
			this.setState({bBox});

			const props = this.props;

			const filteredStations = props.stations.allStations.filter(st =>
				st.lat >= bBox[0].lat
				&& st.lat <= bBox[2].lat
				&& st.lon >= bBox[0].lng
				&& st.lon <= bBox[2].lng
			).concat(allStations
				? props.stations.mobileStations
				: []
			).map(station => station.uri);

			const filter = new SpatialFilter(filteredStations);
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
