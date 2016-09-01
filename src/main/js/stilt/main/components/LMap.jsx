import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as LCommon from '../../../common/main/maps/LeafletCommon';

export default class LMap extends Component{
	constructor(props){
		super(props);
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

		if (nextProps.stations.length > 0 && prevProps.stations.length != nextProps.stations.length) {
			const map = this.state.map;
			const newMarkers = this.buildMarkers(nextProps.stations, nextProps.action);
			map.addLayer(newMarkers);

			LCommon.setView(map, nextProps.stations);
		}
	}

	buildMarkers(geoms, action){
		const markers = L.featureGroup();

		geoms.forEach(geom => {
			// const marker = L.circleMarker([station.lat, station.lon], LCommon.pointIcon());
			const marker = L.marker([geom.lat, geom.lon], {icon: LCommon.wdcggIcon});
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