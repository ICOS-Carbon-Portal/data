import 'babel-polyfill';
import * as LCommon from 'icos-cp-leaflet-common';
import {getRaster, getCountriesGeoJson} from './backend';
import ColorMaker from './models/ColorMaker';
import {TileMappingHelper, getTileCoordBbox, Bbox, BboxMapping, renderRaster} from 'icos-cp-spatial';

const spinnerDelay = 400;

export default class App {
	constructor(config, params){
		this.config = config;
		this.params = params;
		this.timer = undefined;

		this.app = {
			layerControl: null,
			map: null,
			mapMouseOver: null,
			rasterCanvas: document.createElement('canvas'),
			countries: new L.GeoJSON(),
			coordValCtrl: null,
			requestsDone: {
				countries: false,
				binTable: false,
				allDone: () => this.app.requestsDone.countries && this.app.requestsDone.binTable
			}
		};

		if (params.isValidParams) {
			this.main();
		} else {
			let errMsg = '<b>The request you made is not valid!</b>';
			errMsg += '<p>It must contain these parameters: ' + this.params.required.join(', ') + '</p>';

			presentError(errMsg);
		}
	}

	main(){
		this.showSpinner(true);
		// console.log({isValidParams: this.params.isValidParams, varName: this.params.get('varName'), elevation: this.params.get('elevation'), nonExisting: this.params.get('ddd')});

		this.initMap();

		getCountriesGeoJson().then(
			this.addCountries.bind(this),
			err => {
				console.log(err);
				presentError(err.message);
			}
		);

		getRaster(this.params.search).then(
			this.addRaster.bind(this),
			err => {
				console.log(err);
				presentError(err.message);
			}
		);
	}

	initMap(){
		const app = this.app;

		const map = app.map = L.map(
			'map',
			{
				attributionControl: false,
				continuousWorld: true,
				worldCopyJump: false,
				maxBounds: [[-90, -180],[90, 180]],
				crs: L.CRS.EPSG4326,
				center: [0, 0],
				zoom: 2
			}
		);

		const NetCdfLayer = getNetCdfLayer(app);
		app.canvasTiles = new NetCdfLayer({keepBuffer: 0, noWrap: true});

		map.getContainer().style.background = 'white';
		map.addLayer(app.canvasTiles);
		app.canvasTiles.setZIndex(99);
	}

	addCountries(countriesTopo){
		const app = this.app;

		const countryBorders = new L.GeoJSON();
		countryBorders.addData(countriesTopo);
		countryBorders.setStyle({fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1});
		app.map.addLayer(countryBorders);

		const countries = {
			"Country borders": countryBorders
		};

		app.layerControl = L.control.layers(null, countries).addTo(app.map);

		app.requestsDone.countries = true;
		if (app.requestsDone.allDone()) this.showSpinner(false);
	}

	addRaster(binTable){
		console.log({binTable});
		const app = this.app;

		const cm = new ColorMaker(binTable.stats.min, binTable.stats.max, this.params.get('gamma'));
		const colorMaker = cm.makeColor.bind(cm);

		app.rasterCanvas.width = binTable.width;
		app.rasterCanvas.height = binTable.height;
		renderRaster(app.rasterCanvas, binTable, colorMaker);

		const latLonToXY = getLatLonToXYMapping(binTable);
		const worldBox = new Bbox(-180, -90, 180, 90);
		app.tileHelper = new TileMappingHelper(latLonToXY, worldBox);

		app.canvasTiles.refreshTiles();

		app.coordValCtrl = new LCommon.CoordValueViewer(binTable, app.tileHelper, {decimals: 3});
		app.map.addControl(app.coordValCtrl);

		if (this.params.get('fit') === 'true') this.fitBinTable(binTable);

		app.requestsDone.binTable = true;
		if (app.requestsDone.allDone()) this.showSpinner(false);
	}

	fitBinTable(raster){
		const latLngBounds = L.latLngBounds(
			L.latLng(raster.boundingBox.latMin, raster.boundingBox.lonMin),
			L.latLng(raster.boundingBox.latMax, raster.boundingBox.lonMax)
		);

		this.app.map.fitBounds(latLngBounds);
	}

	showSpinner(show){
		if (show) {
			this.timer = setTimeout(() => document.getElementById('loading').style.display = 'inline', spinnerDelay);
		} else {
			clearTimeout(this.timer);
			document.getElementById('loading').style.display = 'none';
		}
	}
}

const drawTile = (rasterCanvas, tileCanvas, tilePoint, tileHelper) => {
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
};

const getLatLonToXYMapping = (raster) => {
	const dsPixels = new Bbox(0, 0, raster.width, raster.height);
	const rbb = raster.boundingBox;
	const dsCoords = new Bbox(rbb.lonMin, rbb.latMin, rbb.lonMax, rbb.latMax).expandToRaster(raster);
	return new BboxMapping(dsCoords, dsPixels);
}

const getNetCdfLayer = (rasterCanvasAndTileHelper) => {

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
};

const presentError = (errMsg) => {
	document.getElementById('map').style.display = 'none';
	document.getElementById('error').innerHTML = errMsg;
};