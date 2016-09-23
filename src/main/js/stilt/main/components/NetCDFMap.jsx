import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import TileMappingHelper, {getTileCoordBbox} from '../../../common/main/geometry/TileMappingHelper';
import Bbox from '../../../common/main/geometry/Bbox';
import BboxMapping from '../../../common/main/geometry/BboxMapping';
import renderRaster from '../../../common/main/maps/renderRaster';

export default class NetCDFMap extends Component{
	constructor(props){
		super(props);
		const NetCdfLayer = getNetCdfLayer(this);
		this.app = {
			rasterId: null,
			countriesAdded: false,
			map: null,
			rasterCanvas: document.createElement('canvas'),
			canvasTiles: new NetCdfLayer(),
			markers: L.featureGroup(),
			countries: new L.GeoJSON(),
			maskHole: null,
			maskHoleVisible: false
		};
	}

	componentDidMount() {
		const app = this.app;
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
		map.addLayer(app.markers);
		map.getContainer().style.background = 'white';
		const self = this;
		app.canvasTiles.on('load', () => {
			if(self.props.renderCompleted){ //callback has been provided
				self.props.renderCompleted();
			}
		});
	}

	componentWillReceiveProps(nextProps){
		const app = this.app;

		if (nextProps.countriesTopo && !app.countriesAdded){
			app.countries.addData(nextProps.countriesTopo);
			app.countries.setStyle({fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1});
			app.map.addLayer(app.countries);
			app.countriesAdded = true;
		}

		if (nextProps.raster && nextProps.raster.id !== app.rasterId) {
			this.updateRasterCanvas(nextProps);
		}

		if(nextProps.reset) {
			this.reset();
			this.panTo(nextProps.latLngBounds);
			this.updateMarkers(nextProps.markers);
			this.addMask(nextProps.raster);
		}
	}

	reset(){
		const app = this.app;
		const ctx = app.rasterCanvas.getContext('2d');

		ctx.clearRect(0, 0, app.rasterCanvas.width, app.rasterCanvas.height);
		app.canvasTiles.redraw();

		if (app.maskHole) app.map.removeLayer(app.maskHole);
		app.maskHoleVisible = false;

		app.markers.clearLayers();
	}

	updateMarkers(propMarkers){
		const markers = this.app.markers;
		markers.clearLayers();

		propMarkers.forEach(marker => {
			markers.addLayer(marker);
		});
	}

	panTo(latLngBounds){
		if (!latLngBounds) return;

		const map = this.app.map;
		const mapBounds = map.getBounds();

		if (!mapBounds.contains(latLngBounds.getCenter())){
			map.panTo(latLngBounds.getCenter());
		}
	}

	addMask(raster){
		const props = this.props;
		const app = this.app;

		if(!props.addMask || !raster || (app.maskHole && app.maskHoleVisible && app.maskHole.isIdentical(raster.boundingBox))) return;

		app.maskHole = props.addMask(raster.boundingBox);
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
		app.tileHelper = getTileHelper(raster);
		app.canvasTiles.redraw();
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		//TODO Remove all layers from the map
		this.app.map = null;
	}

	render() {
		return <div ref='map' style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>;
	}
}

function getTileHelper(raster){
	const dsPixels = new Bbox(0, 0, raster.width, raster.height);
	const rbb = raster.boundingBox;
	const dsCoords = new Bbox(rbb.lonMin, rbb.latMin, rbb.lonMax, rbb.latMax).expandToRaster(raster);
	const dsMapping = new BboxMapping(dsCoords, dsPixels);
	const worldBox = new Bbox(-180, -90, 180, 90);

	return new TileMappingHelper(dsMapping, worldBox);
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

function getNetCdfLayer(netcdfmap){
	return L.GridLayer.extend({
		createTile: function(tilePoint){

			const tileCanvas = L.DomUtil.create('canvas', 'leaflet-tile');
			const size = this.getTileSize();
			tileCanvas.width = size.x;
			tileCanvas.height = size.y;

			const {rasterCanvas, tileHelper} = netcdfmap.app;
			drawTile(rasterCanvas, tileCanvas, tilePoint, tileHelper);

			return tileCanvas;
		}
	});
}

