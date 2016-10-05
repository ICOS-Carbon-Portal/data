import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import * as MapUtils from './MapUtils';
import TileMappingHelper from '../models/TileMappingHelper';
import Bbox from '../models/Bbox';
import BboxMapping from '../models/BboxMapping';


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
			maxBounds: [[-90, -180],[90, 180]],
			crs: L.CRS.EPSG4326,
			center: [0, 0],
			zoom: 2
		});

		//TODO This is a library patch. Should find a dedicated place for it.
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
		const updatedRaster = nextProps.raster && nextProps.gamma && (prevProps.raster !== nextProps.raster || prevProps.gamma !== nextProps.gamma);
		const updatedGamma = prevProps.raster === nextProps.raster && prevProps.gamma !== nextProps.gamma;

		// console.log({prevProps, nextProps, state, addCountries, updatedRaster, updatedGamma});

		if (addCountries){
			this.addCountryLayer(map, nextProps.countriesTopo);
		}

		if (updatedRaster){
			this.updateRasterCanvas(map, nextProps.raster, nextProps.gamma, updatedGamma);
		}

	}

	addCountryLayer(map, countriesTopo){
		const countryStyle = {fillColor: 'blue', fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1};

		const countries = new L.TopoJSON();
		countries.addData(countriesTopo);
		countries.setStyle(countryStyle);
		countries.addTo(map);

		this.setState({map, countriesAdded: true});
	}

	updateRasterCanvas(map, raster, gamma, updatedGamma){
		const self = this;

		const canvasTiles = self.state.canvasTiles;

		const rasterCanvas = self.state.rasterCanvas;
		rasterCanvas.width = raster.width;
		rasterCanvas.height = raster.height;
		self.setState({rasterCanvas});

		MapUtils.makeImage(rasterCanvas, raster, gamma);

		const dsPixels = new Bbox(0, 0, raster.width, raster.height);
		const rbb = raster.boundingBox;
		const dsCoords = new Bbox(rbb.lonMin, rbb.latMin, rbb.lonMax, rbb.latMax).expandToRaster(raster);
		const dsMapping = new BboxMapping(dsCoords, dsPixels);
		const worldBox = new Bbox(-180, -90, 180, 90);

		const tileHelper = new TileMappingHelper(dsMapping, worldBox);
		const rebasedDsCoords = tileHelper.getRebasedDatasetBox();

		canvasTiles.drawTile = function(canvas, tilePoint, zoom) {
			const ctx = canvas.getContext('2d');

			const tileCoords = MapUtils.getTileCoordBbox(tilePoint, zoom);
			const tilePixels = new Bbox(0, 0, canvas.width, canvas.height);
			const tileMapping = new BboxMapping(tileCoords, tilePixels);
			const pixelMaps = tileHelper.getCoordinateMappings(tileMapping);

			ctx.mozImageSmoothingEnabled = false;
			ctx.msImageSmoothingEnabled = false;
			ctx.imageSmoothingEnabled = false;

			pixelMaps.forEach(m => {
				ctx.drawImage(rasterCanvas, m.from.xmin, rasterCanvas.height - m.from.ymax, m.from.xRange, m.from.yRange, m.to.xmin, canvas.height - m.to.ymax, m.to.xRange, m.to.yRange);
			});
		};

		map.removeLayer(canvasTiles);
		canvasTiles.addTo(map);

		const bounds = L.latLngBounds(
			L.latLng(rebasedDsCoords.ymin, rebasedDsCoords.xmin),
			L.latLng(rebasedDsCoords.ymax, rebasedDsCoords.xmax)
		);
		map.panInsideBounds(bounds);
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

