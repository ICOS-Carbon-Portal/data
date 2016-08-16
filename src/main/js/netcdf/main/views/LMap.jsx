import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import {makeImage, getColorMaker} from './MapUtils';
import TileMappingHelper from '../models/TileMappingHelper.js';
import Bbox from '../models/Bbox.js';
import BboxMapping from '../models/BboxMapping.js';

export default class LMap extends Component{
	constructor(props){
		super(props);
		this.state = {
			countriesAdded: false,
			map: null,
			rasterCanvas: document.createElement('canvas'),
			canvasTiles: L.tileLayer.canvas()
		}
	}

	componentDidMount() {
		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			attributionControl: false,
			continuousWorld: true,
			worldCopyJump: false,
			// maxBounds: [[-90, -180],[90, 180]],
			// maxBounds: [[-90, 0],[90, 360]],
			crs: L.CRS.EPSG4326,
			center: [0, 0],
			zoom: 4
		});

		L.TopoJSON = L.GeoJSON.extend({
			addData: function(jsonData) {
				const self = this;

				if (jsonData.type === "Topology") {
					Object.keys(jsonData.objects).forEach(key => {
						const geoJson = topojson.feature(jsonData, jsonData.objects[key]);
						L.GeoJSON.prototype.addData.call(self, geoJson);
					});
				}
				else {
					L.GeoJSON.prototype.addData.call(self, jsonData);
				}
			}
		});

		this.setState({map});
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const map = this.state.map;
		const state = this.state;

		const addCountries = nextProps.countriesTopo && !state.countriesAdded;
		const updatedRaster = prevProps.raster !== nextProps.raster || prevProps.gamma !== nextProps.gamma;
		const updatedGamma = prevProps.raster === nextProps.raster && prevProps.gamma !== nextProps.gamma;

		console.log({prevProps, nextProps, state, addCountries, updatedRaster, updatedGamma});

		if (addCountries){
			this.addCountryLayer(map, nextProps.countriesTopo);
		}

		if (updatedRaster){
			this.updateRasterCanvas(map, nextProps.raster, nextProps.gamma, updatedGamma);
		}

	}

	addCountryLayer(map, countriesTopo){
		const countryStyle = {fillColor: 'blue', fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1};

		if (countriesTopo.type === "Topology") {
			const countries = new L.TopoJSON();
			countries.addData(countriesTopo);
			countries.setStyle(countryStyle);
			countries.addTo(map);
		} else if (countriesTopo.type === "FeatureCollection") {
			const wrapped = Object.assign({}, countriesTopo, {
				features: countriesTopo.features.map(feature => {
					return Object.assign({}, feature, {
						geometry: Object.assign({}, feature.geometry, {
							coordinates: feature.geometry.type === "Polygon"
								? feature.geometry.coordinates.map(arr => {
									return arr.map(coord => {
										if (coord[0] < 0) {
											return [coord[0] + 360, coord[1]];
										} else {
											return coord;
										}
									});
								})
								: feature.geometry.coordinates.map(arr => {
									return arr.map(coords => {
										return coords.map(coord => {
											if (coord[0] < 0) {
												return [coord[0] + 360, coord[1]];
											} else {
												return coord;
											}
										});
									});
							})
						})
					});
				})
			});

			console.log({countriesTopo, wrapped});

			L.geoJson(wrapped, {
				style: countryStyle
			}).addTo(map);
		}

		this.setState({map, countriesAdded: true});
	}

	updateRasterCanvas(map, raster, gamma, updatedGamma){
		const self = this;

		const canvasTiles = self.state.canvasTiles;

		const rasterCanvas = self.state.rasterCanvas;
		rasterCanvas.width = raster.width;
		rasterCanvas.height = raster.height;
		self.setState({rasterCanvas});

		const imgData = getImageData(rasterCanvas, raster, gamma);
		rasterCanvas.getContext('2d').putImageData(imgData, 0, 0);

		function getTileCoordBbox(tilePoint, zoom){

			const tilePoint2Lon = tileNum => tileNum / Math.pow(2, zoom) * 360 - 180;
			const tilePoint2Lat = tileNum => 180 - tileNum / Math.pow(2, zoom) * 360;
			//tileNum => 90 - (tileNum + 1) / Math.pow(2, zoom) * 360;

			const lat0 = tilePoint2Lat(tilePoint.y);
			const lat1 = tilePoint2Lat(tilePoint.y + 1);
			const lon0 = tilePoint2Lon(tilePoint.x);
			const lon1 = tilePoint2Lon(tilePoint.x + 1);

			return new Bbox(lon0, lat1, lon1, lat0);
		}

		const dsPixels = new Bbox(0, 0, raster.width, raster.height);
		const dsCoords = new Bbox(raster.boundingBox.lonMin, raster.boundingBox.latMin, raster.boundingBox.lonMax, raster.boundingBox.latMax);
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
			ctx.webkitImageSmoothingEnabled = false;
			ctx.msImageSmoothingEnabled = false;
			ctx.imageSmoothingEnabled = false;

			pixelMaps.forEach(m => {
/*				if (tilePoint.x == 0 && tilePoint.y == 0) {
					console.log(canvas);
					console.log(tilePoint);
					console.log(tileCoords.toString());
					L.circle([tileCoords.ymax, tileCoords.xmin], 10).addTo(map);
					console.log(m.toString());
				}*/
				ctx.drawImage(rasterCanvas, m.from.xmin, rasterCanvas.height - m.from.ymax, m.from.xRange, m.from.yRange, m.to.xmin, canvas.height - m.to.ymax, m.to.xRange, m.to.yRange);
			});
		};

		map.removeLayer(canvasTiles);
		canvasTiles.addTo(map);
		// map.fitBounds([
		// 	[rebasedDsCoords.ymin, rebasedDsCoords.xmin],
		// 	[rebasedDsCoords.ymax, rebasedDsCoords.xmax]
		// ]);
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
			<div ref='map' className='map'></div>
		);
	}
}

function getImageData(canvas, raster, gamma) {
	var colorMaker = getColorMaker(raster.stats.min, raster.stats.max, Math.abs(gamma));

	var width = raster.width;
	canvas.width = width;
	canvas.height = raster.height;

	var context = canvas.getContext('2d');

	var imgData = context.createImageData(width, raster.height);
	var data = imgData.data;

	var i = 0;
	var white = d3.rgb('white');

	for(var ib = 0; ib < data.length ; ib+=4){
		var x = i % width;
		var y = ~~(i / width); // ~~ rounds towards zero

		var value = raster.getValue(y, x);
		var rgb = isNaN(value) ? white : colorMaker(value);

		data[ib] = rgb.r;
		data[ib + 1] = rgb.g;
		data[ib + 2] = rgb.b;
		data[ib + 3] = 255;

		i++;
	}

	return imgData;
}