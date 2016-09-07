import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import TileMappingHelper, {getTileCoordBbox} from '../../../common/main/geometry/TileMappingHelper';
import Bbox from '../../../common/main/geometry/Bbox';
import BboxMapping from '../../../common/main/geometry/BboxMapping';
import {addTopoGeoJson} from '../../../common/main/maps/LeafletCommon';
import renderRaster from '../../../common/main/maps/renderRaster';
import {positionMarker, pointIcon} from '../../../common/main/maps/LeafletCommon';

export default class NetCDFMap extends Component{
	constructor(props){
		super(props);
		this.app = {
			countriesAdded: false,
			map: null,
			rasterCanvas: document.createElement('canvas'),
			canvasTiles: L.tileLayer.canvas(),
			markers: L.featureGroup()
		}
	}

	componentDidMount() {
		const map = this.app.map = L.map(
			ReactDOM.findDOMNode(this.refs.map),
			Object.assign({
				attributionControl: false,
				continuousWorld: true,
				worldCopyJump: false,
				maxBounds: [[-90, -180],[90, 180]],
				crs: L.CRS.EPSG4326,
				center: [0, 0],
				zoom: 2
			}, this.props.mapOptions)
		);

		map.addLayer(this.app.markers);
		map.getContainer().style.background = 'white';
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const countriesAdded = this.app.countriesAdded;

		const addCountries = nextProps.countriesTopo && !countriesAdded;
		const updatedRaster = nextProps.raster && (prevProps.raster !== nextProps.raster);
		const showStationPosStateChanged = prevProps.showStationPos !== nextProps.showStationPos;

		if (addCountries){
			addTopoGeoJson(this.app.map, nextProps.countriesTopo);
			this.app.countriesAdded = true;
		}

		if (updatedRaster){
			this.updateRasterCanvas(nextProps.raster, nextProps.zoomToRaster);
		}

		if (updatedRaster || showStationPosStateChanged){
			this.updatePosition(nextProps.selectedStation, nextProps.showStationPos);
		}
	}

	updatePosition(position, showStationPos){
		const markers = this.app.markers;
		markers.clearLayers();

		if (position) {
			if (showStationPos) {
				markers.addLayer(L.circleMarker([position.lat, position.lon], pointIcon(6, 0, 'rgb(85,131,255)')));
				markers.addLayer(L.circleMarker([position.lat, position.lon], pointIcon(3, 0, 'rgb(255,255,255)')));
			}

			const map = this.app.map;
			const mapBounds = map.getBounds();
			const positionLatLng = L.latLng(position.lat, position.lon);

			if (!mapBounds.contains(positionLatLng)){
				map.panTo(positionLatLng);
			}
		}
	}

	updateRasterCanvas(raster, zoomToRaster){
		const map = this.app.map;
		const canvasTiles = this.app.canvasTiles;
		const rasterCanvas = this.app.rasterCanvas;

		rasterCanvas.width = raster.width;
		rasterCanvas.height = raster.height;

		renderRaster(rasterCanvas, raster, this.props.colorMaker);

		const dsPixels = new Bbox(0, 0, raster.width, raster.height);
		const rbb = raster.boundingBox;
		const dsCoords = new Bbox(rbb.lonMin, rbb.latMin, rbb.lonMax, rbb.latMax).expandToRaster(raster);
		const dsMapping = new BboxMapping(dsCoords, dsPixels);
		const worldBox = new Bbox(-180, -90, 180, 90);

		const tileHelper = new TileMappingHelper(dsMapping, worldBox);
		const rebasedDsCoords = tileHelper.getRebasedDatasetBox();

		canvasTiles.drawTile = function(canvas, tilePoint, zoom) {
			const ctx = canvas.getContext('2d');

			const tileCoords = getTileCoordBbox(tilePoint, zoom);
			const tilePixels = new Bbox(0, 0, canvas.width, canvas.height);
			const tileMapping = new BboxMapping(tileCoords, tilePixels);
			const pixelMaps = tileHelper.getCoordinateMappings(tileMapping);

			ctx.mozImageSmoothingEnabled = false;
			ctx.msImageSmoothingEnabled = false;
			ctx.imageSmoothingEnabled = false;

			pixelMaps.forEach(m => {
				ctx.drawImage(
					rasterCanvas,
					m.from.xmin,
					rasterCanvas.height - m.from.ymax,
					m.from.xRange,
					m.from.yRange,
					m.to.xmin,
					canvas.height - m.to.ymax,
					m.to.xRange,
					m.to.yRange
				);
			});
		};

		map.removeLayer(canvasTiles);
		canvasTiles.addTo(map);

		if(zoomToRaster) {
			map.fitBounds([
				[rebasedDsCoords.ymin, rebasedDsCoords.xmin],
				[rebasedDsCoords.ymax, rebasedDsCoords.xmax],
			]);
		}
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

