import React, { Component } from 'react';
import L from 'leaflet';
import * as LCommon from 'icos-cp-leaflet-common';
import {TileMappingHelper, getTileCoordBbox, Bbox, BboxMapping} from 'icos-cp-spatial';
import {renderRaster} from "./renderRaster";


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
			coordValCtrl: null,
			isViewSet: false
		};
		const NetCdfLayer = getNetCdfLayer(this.app);
		this.app.canvasTiles = new NetCdfLayer({keepBuffer: 0, noWrap: true});
	}

	componentDidMount() {
		const app = this.app;
		const props = this.props;

		const {centerZoom, mapOptions_woCenterZoom} = Object.keys(props.mapOptions).reduce((acc, curr) => {
			if (curr === 'center' || curr === 'zoom') {
				acc.centerZoom[curr] = props.mapOptions[curr];
			} else {
				acc.mapOptions_woCenterZoom[curr] = props.mapOptions[curr];
			}

			return acc;
		}, {centerZoom: {center: [0, 0], zoom: 2}, mapOptions_woCenterZoom: {}});

		const map = app.map = L.map(
			this.map,
			Object.assign({
				preferCanvas: true,
				attributionControl: false,
				continuousWorld: true,
				worldCopyJump: false,
				maxBounds: [[-90, -180],[90, 180]],
				crs: L.CRS.EPSG4326
			}, mapOptions_woCenterZoom)
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
			};

			map.on('mousemove', app.mapMouseOver);
		}

		if (props.controls){
			props.controls.forEach(ctrl => {
				map.addControl(ctrl);
			});
		}

		if (props.events){
			props.events.forEach(ev => {
				map.on(ev.event, e => {
					ev.callback(ev.event, ev.fn(map, e));
				});
			});
		}

		map.setView(centerZoom.center, centerZoom.zoom);
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
			app.isViewSet = false;
		}

		if(nextProps.reset) {
			this.reset();
		}

		this.adjustMapView(nextProps.latLngBounds);
		this.setMapView(nextProps.centerZoom);
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
		if (!latLngBounds || this.app.isViewSet) return;

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
			const currentZoom = map.getZoom();
			const boundsZoom = map.getBoundsZoom(latLngBounds);

			if (boundsZoom > currentZoom) {
				map.fitBounds(latLngBounds);
			} else if (currentZoom > boundsZoom) {
				map.setView(map.options.forceCenter || latLngBounds.getCenter(), boundsZoom === 0 ? 1 : boundsZoom);
			} else {
				map.panTo(map.options.forceCenter || latLngBounds.getCenter());
			}
		}

		this.app.isViewSet = true;
	}

	setMapView(centerZoom){
		if (!centerZoom || this.app.isViewSet) return;

		this.app.map.setView(centerZoom.center, centerZoom.zoom);
		this.app.isViewSet = true;
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

		renderRaster(app.rasterCanvas, raster, props.colorMaker, props.valueFilter);
		app.tileHelper = getTileHelper(raster);
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

		if (this.props.events){
			this.props.events.forEach(ev => {
				this.app.map.off(ev.event);
			});
		}

		app.map = null;
	}

	render() {
		return <div ref={div => this.map = div} style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>;
	}
}

export function getTileHelper(raster){
	const latLonToXY = getLatLonToXYMapping(raster);
	const worldBox = new Bbox(-180, -90, 180, 90);
	return new TileMappingHelper(latLonToXY, worldBox);
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

