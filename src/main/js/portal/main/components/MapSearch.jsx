import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {spatialExtentDefined} from '../actions';
import * as LCommon from '../models/LeafletCommon';

class MapSearch extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		const props = this.props;
		const self = this;

		const maxZoom = 21;
		const baseMaps = LCommon.getBaseMaps(maxZoom);

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			center: [0,0],
			zoom: 1,
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

		map.on('draw:created', function (e) {
			const layerType = e.layerType;
			const layer = e.layer;

			if (layerType === 'rectangle') {
				const bBox = layer.getLatLngs();
				const filteredStations = self.spatialFilter(bBox);

				self.setState({bBox});
				self.props.setSpatialExtent(filteredStations);
			}
		});

		this.setState({map});
	}

	componentWillReceiveProps(nextProps){
		// console.log({nextProps});
		// console.log({state: this.state});
		const newSpatialData = this.props.spatial.forMap.length != nextProps.spatial.forMap.length;
		const clusteringChanged = this.props.clustered != nextProps.clustered;
		const resetExtent = this.props.resetExtent != nextProps.resetExtent;

		if (newSpatialData || clusteringChanged){
			this.updateMap(nextProps.spatial.forMap, nextProps.clustered);
		} else if(resetExtent){
			this.resetExtent();
		}
	}

	updateMap(stationPositions, cluster){
		const map = this.state.map;
		const markers = this.state.markers;

		if (markers){
			map.removeLayer(markers);
		}
		const newMarkers = this.buildMarkers(stationPositions, cluster);
		map.addLayer(newMarkers);

		if (this.state.bBox) {
			map.fitBounds(this.state.bBox);
		}

		this.setState({map, markers: newMarkers, clustered: cluster, bBox: null});
	}

	resetExtent(){
		const map = this.state.map;
		const props = this.props;

		props.setSpatialExtent(props.spatial.stations);
		map.setView([0,0], 1);
	}

	buildMarkers(stationPositions, cluster){
		let clusteredMarkers = L.markerClusterGroup({
			maxClusterRadius: 50
		});
		let markers = L.featureGroup();

		stationPositions.forEach(station => {
			if (station.lat && station.lon) {
				const marker = cluster
					? L.marker([station.lat, station.lon], {icon: LCommon.wdcggIcon})
					: L.circleMarker([station.lat, station.lon], LCommon.pointIcon(4));
				const popupHeader = "<b>" + station.name + "</b>";
				marker.bindPopup(popupHeader);

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
		return this.props.spatial.forMap.filter(st =>
			st.lat >= bBox[0].lat
			&& st.lat <= bBox[2].lat
			&& st.lon >= bBox[0].lng
			&& st.lon <= bBox[2].lng
		);
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

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		setSpatialExtent(filteredStations){
			dispatch(spatialExtentDefined(filteredStations));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(MapSearch);