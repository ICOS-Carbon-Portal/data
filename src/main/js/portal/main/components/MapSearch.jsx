import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import config from '../config';
import { SpatialFilter, EmptyFilter } from '../models/Filters'
import {updateFilter} from '../actions';
import * as LCommon from '../models/LeafletCommon';

class MapSearch extends Component {
	constructor(props) {
		super(props);
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
			attributionControl: false
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

		L.drawLocal.draw.toolbar.buttons.rectangle = 'Limit stations by drawing a rectangle';

		const drawControl = new L.Control.Draw(drawOptions);
		map.addControl(drawControl);

		map.on('draw:created', e => {
			const layerType = e.layerType;
			const layer = e.layer;

			if (layerType === 'rectangle') {
				const bBox = layer.getLatLngs();
				const filteredStations = self.spatialFilter(bBox);

				const filter = new SpatialFilter(config.spatialStationProp, filteredStations);
				self.props.filterUpdate(config.spatialStationProp, filter);
			}
		});

		// map.on('zoomend', e => {
		// 	console.log({zoom: map.getZoom()});
		// 	// if (map.getZoom() == 6){
		// 	// 	self.updateMap(self.props.spatial.stations, self.props.spatial.forMap, self.props.clustered);
		// 	// }
		// });

		this.setState({map, drawMap: true});
	}

	componentWillReceiveProps(nextProps){
		const drawMap = nextProps.spatial.forMap.length > 0 && this.state.drawMap;
		const newSpatialData = this.props.spatial.forMap.length != nextProps.spatial.forMap.length;
		const clusteringChanged = this.props.clustered != nextProps.clustered;
		const resetExtent = this.props.resetExtent != nextProps.resetExtent;
		const zoomToAll = this.props.showAll != nextProps.showAll;
		const zoomToSelected = this.props.zoomTo != nextProps.zoomTo;

		// console.log({nextSpatial: nextProps.spatial, drawMap, newSpatialData, clusteringChanged, resetExtent, zoomToAll, zoomToSelected, filters: nextProps.filters});

		if (drawMap || newSpatialData || clusteringChanged){
			this.setState({drawMap: false});
			this.updateMap(nextProps.spatial.stations, nextProps.spatial.forMap, nextProps.clustered);

		} else if(resetExtent){
			this.resetExtent();

		} else if(zoomToAll){
			this.zoomTo(true);

		} else if(zoomToSelected){
			this.zoomTo(false);
		}
	}

	updateMap(allStations, filteredStations, cluster){
		const map = this.state.map;
		const markers = this.state.markers;

		if (markers){
			map.removeLayer(markers);
		}
		const newMarkers = this.buildMarkers(allStations, filteredStations, cluster, map.getZoom());
		map.addLayer(newMarkers);

		this.setState({map, markers: newMarkers, clustered: cluster, bBox: null});
	}

	resetExtent(){
		const map = this.state.map;
		const props = this.props;

		props.filterUpdate(config.spatialStationProp, new EmptyFilter());
		map.setView([0, 0], 1);
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
		// console.log({stationName, remove, spatial: this.props.spatial});
		const woSpatialExtent = this.props.spatial.woSpatialExtent;
		const forMap = this.props.spatial.forMap;
		const stations = this.props.spatial.stations;

		if(remove){
			const filteredStations = forMap.filter(st => st.name != stationName).concat(woSpatialExtent);
			const filter = new SpatialFilter(config.spatialStationProp, filteredStations);
			this.props.filterUpdate(config.spatialStationProp, filter);
		} else {
			const filteredStations = forMap.concat(stations.filter(st => st.name == stationName)).concat(woSpatialExtent);
			const filter = filteredStations.length == stations.length
				? new EmptyFilter()
				: new SpatialFilter(config.spatialStationProp, filteredStations);
			this.props.filterUpdate(config.spatialStationProp, filter);
		}
	}

	buildMarkers(allStations, filteredStations, cluster, zoomLevel){
		let clusteredMarkers = L.markerClusterGroup({
			maxClusterRadius: 50
		});
		let markers = L.featureGroup();

		// First all excluded stations so they are placed underneath included
		allStations.forEach(station => {
			if (station.lat && station.lon && filteredStations.findIndex(fs => fs.name == station.name) < 0) {
				const marker = cluster
					? L.circleMarker([station.lat, station.lon], LCommon.pointIconExcluded(3))
					: L.circleMarker([station.lat, station.lon], LCommon.pointIconExcluded(3));

				marker.bindPopup(popupHeader(station.name, false, this));

				if (cluster) {
					clusteredMarkers.addLayer(marker);
				} else {
					markers.addLayer(marker);
				}
			}
		});

		// Then included stations
		allStations.forEach(station => {
			if (station.lat && station.lon && filteredStations.findIndex(fs => fs.name == station.name) >= 0) {
				const marker = cluster
					? L.marker([station.lat, station.lon], {icon: LCommon.wdcggIcon})
					: L.circleMarker([station.lat, station.lon], LCommon.pointIcon(4));

				marker.bindPopup(popupHeader(station.name, true, this, filteredStations.length > 1));

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

	spatialFilter(bBox){
		return this.props.spatial.stations.filter(st =>
			st.lat >= bBox[0].lat
			&& st.lat <= bBox[2].lat
			&& st.lon >= bBox[0].lng
			&& st.lon <= bBox[2].lng
		).concat(this.props.spatial.woSpatialExtent);
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

function popupHeader(stationName, remove, self, showRemoveBtn = true){
	const className = remove ? 'glyphicon glyphicon-remove-circle' : 'glyphicon glyphicon-ok-circle';

	const div = document.createElement('div');

	const b = document.createElement('b');
	b.innerHTML = stationName;
	div.appendChild(b);

	if(!remove || showRemoveBtn) {
		div.appendChild(document.createElement('br'));

		const btn = document.createElement('button');
		btn.className = 'btn btn-primary';
		btn.onclick = function () {
			self.addRemoveStation(stationName, remove);
			return false;
		};

		const span = document.createElement('span');
		span.className = className;
		span.setAttribute('style', 'margin-right: 5px');


		const btnTxt = document.createElement('span');
		btnTxt.innerHTML = remove ? 'Remove' : 'Add';

		btn.appendChild(span);
		btn.appendChild(btnTxt);
		div.appendChild(btn);
	}

	return div;
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		filterUpdate: function (propUri, filter) {
			dispatch(updateFilter(propUri, filter));
		}
	}
}

export default connect(stateToProps, dispatchToProps)(MapSearch);