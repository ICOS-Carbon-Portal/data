import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import TileMappingHelper, {getTileCoordBbox} from '../geometry/TileMappingHelper';
import Bbox from '../geometry/Bbox';
import BboxMapping from '../geometry/BboxMapping';
import renderRaster from './renderRaster';
import * as LCommon from '../../../common/main/maps/LeafletCommon';

/*
 Incoming props
 mapOptions: OPTIONAL (Object) - Override options for Leaflet in componentDidMount
 geoJson: OPTIONAL (Leaflet GeoJSON object or an array of GeoJSON objects) - Display GeoJSON layer in map, usually a country layer
 raster: REQUIRED (BinRaster) - Raster data to show in map
 overlay: OPTIONAL (object with [Leaflet Layer]) - Feature overlay to be displayed in map. Feature symbols must be able to be added to a Leaflet featureGroup
 	Example: {label: "Station", features: [Leaflet Layer]}
 latLngBounds: OPTIONAL (L.latLngBounds) - If included, map will pan to center point of bounds
 reset: OPTIONAL (Boolean) - If true, map will clear canvas, mask and overlay
 colorMaker: REQUIRED (colorMaker) - Defines what colors the raster gets
 renderCompleted: OPTIONAL (function) - What to do when canvas rendering is completed
 mask: OPTIONAL (polygonMask) - Display mask showing extent
 maskOptions; OPTIONAL (JS Object) - Override default options of mask
 */

export default class NetCDFMap extends Component{
	constructor(props){
		super(props);
		this.app = {
			rasterId: null,
			layerControl: null,
			layerCtrlAdded: false,
			map: null,
			mapMouseOver: null,
			rasterCanvas: document.createElement('canvas'),
			overlay: L.featureGroup(),
			countries: new L.GeoJSON(),
			maskHole: null,
			maskHoleVisible: false,
			coordValCtrl: null
		};
		const NetCdfLayer = getNetCdfLayer(this.app);
		this.app.canvasTiles = new NetCdfLayer({keepBuffer: 0, noWrap: true});
	}

	componentDidMount() {
		const app = this.app;
		const props = this.props;

		const map = app.map = L.map(
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

		map.addLayer(app.canvasTiles);
		app.canvasTiles.setZIndex(99);
		map.addLayer(app.overlay);
		map.getContainer().style.background = 'white';

		if (props.mouseOverCB) {
			app.mapMouseOver = e => {
				const raster = this.props.raster;
				const latlng = e.latlng;

				if (raster && app.tileHelper) {
					const xy = app.tileHelper.lookupPixel(latlng.lng, latlng.lat);
					if(xy){
						const val = raster.getValue(Math.round(raster.height - xy.y - 0.5), Math.round(xy.x - 0.5));

						if (!isNaN(val)) {
							this.props.mouseOverCB(val);
						}
					}
				}
			}

			map.on('mousemove', app.mapMouseOver);
		}

		// if (props.controls){
		// 	props.controls.forEach(ctrl => {
		// 		map.addControl(ctrl);
		// 	});
		// }
	}

	componentWillReceiveProps(nextProps){
		const app = this.app;

		if (nextProps.geoJson && !app.layerCtrlAdded){
			const countryBorders = new L.GeoJSON();
			countryBorders.addData(nextProps.geoJson);
			countryBorders.setStyle({fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1});
			app.map.addLayer(countryBorders);

			const countries = {
				"Country borders": countryBorders
			};

			app.layerControl = L.control.layers(null, countries).addTo(app.map);
			app.layerCtrlAdded = true;
		}

		if (nextProps.raster && nextProps.raster.id !== app.rasterId) {
			this.updateRasterCanvas(nextProps);
			this.updateCoordValViewer(app, nextProps);
		}

		if(nextProps.reset) {
			this.reset();
		}

		this.adjustMapView(nextProps.latLngBounds);
		this.updateOverlay(nextProps.overlay);
		this.addMask(nextProps.raster);
	}

	reset(){
		const app = this.app;
		const ctx = app.rasterCanvas.getContext('2d');

		ctx.clearRect(0, 0, app.rasterCanvas.width, app.rasterCanvas.height);
		app.canvasTiles.redraw();

		if (app.maskHole) app.map.removeLayer(app.maskHole);
		app.maskHoleVisible = false;

		app.overlay.clearLayers();
	}

	updateOverlay(propOverlay){
		if (!propOverlay) return;

		const app = this.app;
		const overlay = app.overlay;
		overlay.clearLayers();
		app.layerControl.removeLayer(overlay);

		propOverlay.features.forEach(feature => {
			overlay.addLayer(feature);
		});

		if (propOverlay.features.length > 0) {
			app.layerControl.addOverlay(overlay, propOverlay.label);
		}
	}

	updateCoordValViewer(app, props){
		if (app.coordValCtrl) app.coordValCtrl.remove();

		app.coordValCtrl = new LCommon.CoordValueViewer(props.raster, app.tileHelper, {decimals: 3});
		app.map.addControl(app.coordValCtrl);
	}

	adjustMapView(latLngBounds){
		if (!latLngBounds) return;

		const map = this.app.map;
		const southWest = latLngBounds.getSouthWest();
		const northEast = latLngBounds.getNorthEast();
		const mapBounds = map.getBounds();
		const isPoint = southWest.lat === northEast.lat && southWest.lng === northEast.lng;

		if (isPoint) {
			if (!mapBounds.contains(latLngBounds.getCenter())) {
				map.panTo(latLngBounds.getCenter());
			}
		} else {
			if (!mapBounds.contains(latLngBounds)) {
				map.fitBounds(latLngBounds);
			}
		}
	}

	addMask(raster){
		const props = this.props;
		const app = this.app;

		if(!props.mask || !raster || (app.maskHole && app.maskHoleVisible && app.maskHole.isIdentical(raster.boundingBox))) return;

		app.maskHole = props.mask(raster.boundingBox, props.maskOptions);
		app.maskHole.addTo(app.map);
		app.maskHoleVisible = true;
	}

	updateRasterCanvas(props){
		const raster = props.raster;
		if(!raster) return;
		const app = this.app;
		app.rasterId = props.raster.id;

		app.rasterCanvas.width = raster.width;
		app.rasterCanvas.height = raster.height;

		renderRaster(app.rasterCanvas, raster, props.colorMaker);
		const latLonToXY = getLatLonToXYMapping(raster);
		const worldBox = new Bbox(-180, -90, 180, 90);
		app.tileHelper = new TileMappingHelper(latLonToXY, worldBox);
		app.canvasTiles.refreshTiles();
		if(props.renderCompleted) props.renderCompleted();
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		//TODO Remove all layers from the map
		const app = this.app;

		if (this.props.mouseOverCB) app.map.off('mousemove', app.mapMouseOver);
		app.map = null;
	}

	render() {
		return <div ref='map' style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>;
	}
}

function getLatLonToXYMapping(raster){
	const dsPixels = new Bbox(0, 0, raster.width, raster.height);
	const rbb = raster.boundingBox;
	const dsCoords = new Bbox(rbb.lonMin, rbb.latMin, rbb.lonMax, rbb.latMax).expandToRaster(raster);
	return new BboxMapping(dsCoords, dsPixels);
}

function drawTile(rasterCanvas, tileCanvas, tilePoint, tileHelper) {
	if(!tileHelper) return;

	const tileCoords = getTileCoordBbox(tilePoint);
	const tilePixels = new Bbox(0, 0, tileCanvas.width, tileCanvas.height);
	const tileMapping = new BboxMapping(tileCoords, tilePixels);
	const pixelMaps = tileHelper.getCoordinateMappings(tileMapping);

	const ctx = tileCanvas.getContext('2d');
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
			tileCanvas.height - m.to.ymax,
			m.to.xRange,
			m.to.yRange
		);
	});
}

function getNetCdfLayer(rasterCanvasAndTileHelper){

	function drawTileCanvas(tileCanvas, tilePoint){
		const {rasterCanvas, tileHelper} = rasterCanvasAndTileHelper;
		drawTile(rasterCanvas, tileCanvas, tilePoint, tileHelper);
	}

	return L.GridLayer.extend({

		refreshTiles: function(){
			const tiles = this._tiles;

			Object.keys(tiles).forEach(key => {
				const tile = tiles[key];
				tile.el.getContext('2d').clearRect(0, 0, tile.el.width, tile.el.height);
				drawTileCanvas(tile.el, tile.coords);
			});
		},

		createTile: function(tilePoint){
			const tileCanvas = L.DomUtil.create('canvas', 'leaflet-tile');

			const size = this.getTileSize();
			tileCanvas.width = size.x;
			tileCanvas.height = size.y;

			drawTileCanvas(tileCanvas, tilePoint);

			return tileCanvas;
		}
	});
}
