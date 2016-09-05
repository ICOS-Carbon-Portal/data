import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import TileMappingHelper, {getTileCoordBbox} from '../../../common/main/geometry/TileMappingHelper';
import Bbox from '../../../common/main/geometry/Bbox';
import BboxMapping from '../../../common/main/geometry/BboxMapping';
import {addTopoGeoJson} from '../../../common/main/maps/LeafletCommon';
import renderRaster from '../../../common/main/maps/renderRaster';


export default class NetCDFMap extends Component{
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
		const map = this.map = L.map(
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

		map.getContainer().style.background = 'white';

		this.setState({map});
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const map = this.state.map;
		const state = this.state;

		const addCountries = nextProps.countriesTopo && !state.countriesAdded;
		const updatedRaster = nextProps.raster && (prevProps.raster !== nextProps.raster);

		// console.log({prevProps, nextProps, state, addCountries, updatedRaster});

		if (addCountries){
			addTopoGeoJson(map, nextProps.countriesTopo);
			this.setState({map, countriesAdded: true});
		}

		if (updatedRaster){
			this.updateRasterCanvas(map, nextProps.raster, nextProps.zoomToRaster);
		}

	}

	updateRasterCanvas(map, raster, zoomToRaster){
		const self = this;

		const canvasTiles = self.state.canvasTiles;

		const rasterCanvas = self.state.rasterCanvas;
		rasterCanvas.width = raster.width;
		rasterCanvas.height = raster.height;
		self.setState({rasterCanvas});

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
		this.map.off('click', this.onMapClick);
		this.map = null;
	}

	render() {
		return (
			<div ref='map' style={{width: '100%', height: '100%', display: 'block', border: '1px solid darkgrey'}}></div>
		);
	}
}

