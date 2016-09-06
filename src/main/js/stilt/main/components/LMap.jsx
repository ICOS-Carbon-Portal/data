import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as LCommon from '../../../common/main/maps/LeafletCommon';

export default class LMap extends Component{
	constructor(props){
		super(props);
		this.app = {
			map: null,
			markers: L.featureGroup()
		}
	}

	componentDidMount() {
		const baseMaps = LCommon.getBaseMaps(21);

		const map = this.app.map = L.map(ReactDOM.findDOMNode(this.refs.map),
			{
				layers: [baseMaps.Topographic],
				worldCopyJump: false,
				maxBounds: [[-90, -180],[90, 180]],
				attributionControl: false
			}
		);

		L.control.layers(baseMaps).addTo(map);
		map.addControl(new LCommon.CoordViewer({decimals: 4}));
		map.addLayer(this.app.markers);
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const buildMarkers = (nextProps.stations.length > 0 && prevProps.stations.length != nextProps.stations.length) ||
			(nextProps.selectedStation != undefined && prevProps.selectedStation != nextProps.selectedStation);

		if (buildMarkers) {
			const map = this.app.map;
			this.buildMarkers(nextProps.stations, nextProps.action, nextProps.selectedStation);

			if (nextProps.selectedStation == undefined) {

				LCommon.setView(map, nextProps.stations);

			} else {

				const mapBounds = map.getBounds();
				const selectedStationPosition = L.latLng(nextProps.selectedStation.lat, nextProps.selectedStation.lon);
				const markerIcon = this.app.markers.getLayers()[0].options.icon;
				const markerPoint = map.latLngToLayerPoint(L.latLng(selectedStationPosition));
				const markerBoundaryLL = map.layerPointToLatLng(
					L.point(markerPoint.x - markerIcon.options.iconSize[0] / 2, markerPoint.y)
				);
				const markerBoundaryUR = map.layerPointToLatLng(
					L.point(markerPoint.x + markerIcon.options.iconSize[0] / 2, markerPoint.y - markerIcon.options.iconSize[1])
				);
				const selectedStationBounds = L.latLngBounds(markerBoundaryLL, markerBoundaryUR);

				if (!mapBounds.contains(selectedStationBounds)){
					map.panTo(selectedStationPosition);
				}
			}
		}
	}

	buildMarkers(geoms, action, selectedStation){
		const markers = this.app.markers;
		markers.clearLayers();

		geoms.forEach(geom => {
			const marker = selectedStation != undefined && selectedStation.id === geom.id
				? L.marker([geom.lat, geom.lon], {icon: LCommon.wdcggIconHighlight})
				: L.marker([geom.lat, geom.lon], {icon: LCommon.wdcggIcon});

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
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		this.app.map.off('click', this.onMapClick);
		this.app.map = null;
	}

	render() {
		return (
			<div ref='map' style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>
		);
	}
}