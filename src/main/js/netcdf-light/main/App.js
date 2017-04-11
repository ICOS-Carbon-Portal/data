import * as LCommon from 'icos-cp-leaflet-common';
import {TileMappingHelper, getTileCoordBbox, Bbox, BboxMapping, renderRaster} from 'icos-cp-spatial';

export default class App {
	constructor(config, params){
		this.config = config;
		this.params = params;

		this.app = {
			map: null,
			layerControl: null,
			mapMouseOver: null,
			rasterCanvas: document.createElement('canvas'),
			countries: new L.GeoJSON(),
			coordValCtrl: null
		};

		if (params.isValidParams) {
			// const NetCdfLayer = getNetCdfLayer(this.app);
			// this.app.canvasTiles = new NetCdfLayer({keepBuffer: 0, noWrap: true});

			this.main();
		} else {
			let errMsg = '<b>The request you made is not valid!</b>';
			errMsg += '<p>It must contain <i>service</i>, <i>varName</i>, <i>date</i> and <i>elevation</i></p>';

			presentError(errMsg);
		}
	}

	main(){
		document.getElementById('loading').style.display = 'inline';
		console.log({varName: this.params.get('varName'), elevation: this.params.get('elevation'), nonExisting: this.params.get('ddd')});

		const map = this.app.map = L.map(
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

		// map.addLayer(this.app.canvasTiles);
		// this.app.canvasTiles.setZIndex(99);
		map.getContainer().style.background = 'white';
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

const getNetCdfLayer = (rasterCanvasAndTileHelper) => {

	const drawTileCanvas = (tileCanvas, tilePoint) => {
		const {rasterCanvas, tileHelper} = rasterCanvasAndTileHelper;
		drawTile(rasterCanvas, tileCanvas, tilePoint, tileHelper);
	}

	return L.GridLayer.extend({

		refreshTiles: () => {
			const tiles = this._tiles;

			Object.keys(tiles).forEach(key => {
				const tile = tiles[key];
				tile.el.getContext('2d').clearRect(0, 0, tile.el.width, tile.el.height);
				drawTileCanvas(tile.el, tile.coords);
			});
		},

		createTile: (tilePoint) => {
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
	document.getElementById('error').innerHTML = errMsg;
};