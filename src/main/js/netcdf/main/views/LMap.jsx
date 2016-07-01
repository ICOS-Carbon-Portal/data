import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import {makeImage} from './MapUtils';

export default class LMap extends Component{
	constructor(props){
		super(props);
		this.state = {
			countriesLoaded: false,
			loadCanvas: true
		}
	}

	componentDidMount() {
		const self = this;
		// console.log({props: this.props});
		// const topo = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
		// 	maxZoom: 14
		// });

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			attributionControl: false,
			maxBounds: [[-90, -180],[90, 180]],
			crs: L.CRS.EPSG4326
		});

		map.setView([20, 0], 3);

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

		map.on('zoomstart', e => {
			showCanvasContainer(false);
		});

		map.on('mousedown', e => {
			showCanvasContainer(false);
		});

		map.on('zoomend', e => {
			showCanvasContainer(true);
			self.setState({loadCanvas: true});
		});

		map.on('mouseup', e => {
			showCanvasContainer(true);
			self.setState({loadCanvas: true});
		});

		this.setState({map});
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const map = this.state.map;
		const state = this.state;
		console.log({prevProps, nextProps, state});

		if (nextProps.countriesTopo && !state.countriesLoaded){
			this.addCountryLayer(map, nextProps.countriesTopo);
		}

		if (prevProps.raster !== nextProps.raster || prevProps.gamma !== nextProps.gamma){
			this.addCanvasLayer(map, nextProps.raster, nextProps.gamma);
		}
	}

	addCountryLayer(map, countriesTopo){
		const countries = new L.TopoJSON();
		const countryStyle = {fillColor: 'blue', fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1};
		countries.addData(countriesTopo);
		countries.setStyle(countryStyle);
		countries.addTo(map);

		this.setState({map, countriesLoaded: true});
	}

	addCanvasLayer(map, raster, gamma){
		const self = this;

		const CanvasLayer = L.CanvasLayer.extend({
			render: function(){
				const canvas = this.getCanvas();

				if (self.state.loadCanvas) {
					console.log({this, self, map, raster, gamma});
					const context = canvas.getContext('2d');

					const mapLL = map.latLngToContainerPoint(new L.LatLng(raster.boundingBox.latMin, raster.boundingBox.lonMin));
					const mapUR = map.latLngToContainerPoint(new L.LatLng(raster.boundingBox.latMax, raster.boundingBox.lonMax));

					const canvasStyleWidth = mapUR.x - mapLL.x;
					const canvasStyleHeight = mapLL.y - mapUR.y;

					context.clearRect(0, 0, canvasStyleWidth, canvasStyleHeight);

					makeImage(canvas, raster, gamma);

					const style = "position: absolute; top: " + mapUR.y + "px; left: " + mapLL.x + "px; pointer-events: none; z-index: 0; width: "
						+ canvasStyleWidth + "px; height: " + canvasStyleHeight + "px;";
					canvas.setAttribute("style", style);
					canvas.id = "rasterLayer";
					canvas.className = "raster";
					self.setState({loadCanvas: false});
				}
			}
		});

		const canvasLayer = new CanvasLayer();
		canvasLayer.addTo(map);
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

function showCanvasContainer(show){
console.log({showCanvasContainer: show});
	const canvasContainer = document.getElementsByClassName("leaflet-layer")[0];
	show
		? canvasContainer.setAttribute("style", "display:inline;")
		: canvasContainer.setAttribute("style", "display:none;");
}