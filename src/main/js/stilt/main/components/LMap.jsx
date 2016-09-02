import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as LCommon from '../../../common/main/maps/LeafletCommon';

export default class LMap extends Component{
	constructor(props){
		super(props);
		this.state = {
			markers: L.featureGroup()
		}
	}

	componentDidMount() {
		const baseMaps = LCommon.getBaseMaps(21);

		const map = L.map(ReactDOM.findDOMNode(this.refs.map),
			{
				layers: [baseMaps.Topographic],
				worldCopyJump: false,
				maxBounds: [[-90, -180],[90, 180]],
				attributionControl: false
			}
		);

		map.addControl(new LCommon.CoordViewer({decimals: 4}));

		this.setState({map});
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;

		// console.log({
		// 	prevSelectedStation: prevProps.selectedStation ? prevProps.selectedStation.name : null,
		// 	nextSelectedStation: nextProps.selectedStation ? nextProps.selectedStation.name : null
		// });

		if (nextProps.stations.length > 0 && prevProps.stations.length != nextProps.stations.length) {
			const map = this.state.map;
			const newMarkers = this.buildMarkers(nextProps.stations, nextProps.action);
			map.addLayer(newMarkers);

			LCommon.setView(map, nextProps.stations);

		} else if(nextProps.selectedStation != null && prevProps.selectedStation != nextProps.selectedStation){
			// this.highlightMarker(nextProps.selectedStation);
			this.buildMarkers(nextProps.stations, nextProps.action, nextProps.selectedStation);
		}
	}

	highlightMarker(selectedStation){
		const map = this.state.map;
		map.eachLayer(layer => {
			console.log({layer, stations: this.props.stations, selectedStation});
		});
	}

	buildMarkers(geoms, action, selectedStation){
		const markers = this.state.markers;
		markers.clearLayers();

		geoms.forEach(geom => {
			const marker = selectedStation != null && selectedStation.uri === geoms.uri
				? L.circleMarker([geom.lat, geom.lon], LCommon.pointIcon())
				: L.marker([geom.lat, geom.lon], {icon: LCommon.wdcggIcon});
			// const marker = L.circleMarker([station.lat, station.lon], LCommon.pointIcon());
			// const marker = L.marker([geom.lat, geom.lon], {icon: LCommon.wdcggIcon});
			marker.bindPopup(LCommon.popupHeader(geom.name));

			marker.on('mouseover', function (e) {
				this.openPopup();
			});
			marker.on('mouseout', function (e) {
				this.closePopup();
			});

			marker.on('click', function(){
				action(geom);
			});

			markers.addLayer(marker);
		});

		this.setState({markers});
		return markers;
	}

	debug(sender, props){
		console.log({sender, props});
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
			<div ref='map' style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>
		);
	}
}