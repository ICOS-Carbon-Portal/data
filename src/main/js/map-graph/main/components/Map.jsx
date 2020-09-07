import React, { Component } from 'react';
import L from 'leaflet';
import '../../../../node_modules/leaflet/dist/leaflet.css';//path from within tsTarget ts compiler output
import * as LCommon from 'icos-cp-leaflet-common';
import PointReducer from '../models/PointReducer';
import {colorMaker} from "../models/colorMaker";
import CanvasLegend from '../legend/CanvasLegend';
import {legendCtrl} from '../legend/LegendCtrl';
import {Stats} from '../controls/Stats';
import {FullExtent} from '../controls/FullExtent';
import {debounce} from 'icos-cp-utils';


export default class Map extends Component{
	constructor(props){
		super(props);

		this.initCenter = props.center;
		this.initZoom = props.zoom;
		this.setInitCenterZoom = this.initCenter !== undefined && this.initZoom !== undefined;

		this.leafletMap = undefined;
		this.textCtrl = undefined;
		this.fullExtentCtrl = undefined;
		this.legendCtrl = undefined;
		this.mapElement = undefined;
		this.layerGroup = undefined;
		this.boatMarker = undefined;
		this.moveEndFn = undefined;
		this.handleMoveEnd = this.moveEndHandler.bind(this);

		this.mapPointMouseOver = props.mapPointMouseOver;

		this.colorMaker = undefined;
	}

	componentDidMount(){
		this.createNewMap();
	}

	componentDidUpdate(prevProps){
		const {binTableData, valueIdx, afterPointsFiltered, fromGraph, center, zoom} = this.props;
		const renderPoints = (binTableData.isValidData && valueIdx !== undefined && this.colorMaker === undefined)
			|| prevProps.valueIdx !== valueIdx;
		const newCenterZoom = getNewCenterZoom(prevProps, center, zoom, this.leafletMap);

		if (newCenterZoom){
			this.leafletMap.setView(newCenterZoom.center, newCenterZoom.zoom);
		} else if (renderPoints) {
			const zoomToPoints = this.colorMaker === undefined;
			if (this.legendCtrl) this.leafletMap.removeControl(this.legendCtrl);

			this.addPoints(zoomToPoints, true, binTableData, valueIdx, afterPointsFiltered);
		}

		if (prevProps.fromGraph !== fromGraph) {
			this.addMarker(fromGraph);
		}
	}

	addMarker(position){
		if (position && !isNaN(position.latitude) && !isNaN(position.longitude)){
			if (this.boatMarker){
				this.boatMarker.setLatLng([position.latitude, position.longitude]);
			} else {
				this.boatMarker = getMarker(position);
				this.leafletMap.addLayer(this.boatMarker);
			}
		} else if (this.boatMarker) {
			this.leafletMap.removeLayer(this.boatMarker);
			this.boatMarker = undefined;
		}
	}

	createNewMap(){
		const baseMaps = LCommon.getBaseMaps(21);

		const map = this.leafletMap = L.map(this.mapElement.id,
			{
				preferCanvas: true,
				layers: [baseMaps.Topographic],
				worldCopyJump: false,
				maxBounds: [[-90, -180],[90, 180]],
				center: this.setInitCenterZoom ? this.initCenter : [0, 0],
				zoom: this.setInitCenterZoom ? this.initZoom : 1,
				attributionControl: false
			}
		);

		this.fullExtentCtrl = new FullExtent();
		map.addControl(this.fullExtentCtrl);

		this.statsCtrl = new Stats();
		map.addControl(this.statsCtrl);

		L.control.layers(baseMaps, null, {position: 'topleft'}).addTo(map);
		map.addControl(new LCommon.CoordViewer({decimals: 2}));

		this.layerGroup = L.layerGroup();
		map.addLayer(this.layerGroup);
	}

	moveEndHandler(moveEndFn){
		if (this.moveEndFn) this.leafletMap.off('moveend', this.moveEndFn);
		if (moveEndFn) this.leafletMap.on('moveend', moveEndFn);
		this.moveEndFn = moveEndFn;
	}

	updateLegend(newSize, getLegend){
		const canvasLegend = new CanvasLegend(getLegendHeight(newSize.y), getLegend);
		this.legendCtrl.update(canvasLegend.renderLegend());
	}

	addPoints(zoomToPoints, redefineColor, binTableData, valueIdx, afterPointsFiltered){
		const map = this.leafletMap;
		const layerGroup = this.layerGroup;

		if (zoomToPoints) this.handleMoveEnd();
		layerGroup.clearLayers();

		const pointReducer = new PointReducer(map, binTableData, valueIdx, redefineColor);
		const stats = pointReducer.stats;

		if (redefineColor) {
			const mapSize = map.getSize();
			const min = pointReducer.adjustedMinMax
				? pointReducer.adjustedMinMax.min
				: stats.min;
			const max = pointReducer.adjustedMinMax
				? pointReducer.adjustedMinMax.max
				: stats.max;

			this.colorMaker = colorMaker(min, max, calculateDecimals(min, max), getLegendHeight(mapSize.y));
			const canvasLegend = new CanvasLegend(getLegendHeight(mapSize.y), this.colorMaker.getLegend);
			this.legendCtrl = legendCtrl(canvasLegend.renderLegend(), {position: 'topright', showOnLoad: true});
			map.addControl(this.legendCtrl);

			this.statsCtrl.updateStats(stats);
		}

		pointReducer.reducedPoints.forEach(p => {
			const cm = L.circleMarker([p[pointReducer.latIdx], p[pointReducer.lngIdx]], {
				radius: 5,
				weight: 0,
				fillColor: `rgba(${this.colorMaker.getColor(p[valueIdx]).join(',')})`,
				fillOpacity: 1,
				dataCoord: {dataX: p[pointReducer.dateIdx], dataY: p[valueIdx], row: p[p.length - 1]}
			});

			cm.on('mouseover', e => this.mapPointMouseOver(e.target.options.dataCoord));
			cm.on('mouseout', () => this.mapPointMouseOver({dataX: undefined, dataY: undefined, row: undefined}));

			layerGroup.addLayer(cm);
		});

		if (pointReducer.pointCount > 0) {
			this.legendCtrl.show();

			if (zoomToPoints) {
				const updateLegend = this.updateLegend.bind(this);
				map.on('resize', resizeCB(stats.min, stats.max, updateLegend));

				const points = pointReducer.reducedPoints.map(row => [row[pointReducer.latIdx], row[pointReducer.lngIdx]]);

				if (!this.setInitCenterZoom) map.fitBounds(points);
				this.fullExtentCtrl.updatePoints(points);
				this.handleMoveEnd(_ => this.addPoints(false, false, binTableData, valueIdx, afterPointsFiltered));
			} else if (redefineColor) {
				this.handleMoveEnd(_ => this.addPoints(false, false, binTableData, valueIdx, afterPointsFiltered));
			}
		} else {
			this.legendCtrl.hide();
		}

		if (afterPointsFiltered) afterPointsFiltered(pointReducer, map.getCenter(), map.getZoom());
	}

	render(){
		return (
			<div
				ref={div => this.mapElement = div} id="map"
				style={{
					width: '100%',
					minHeight: 420,
					paddingTop: '30%',
					border: '1px solid #ddd',
					borderRadius: '4px'
				}}
			/>
		);
	}
}

const getMarker = position => {
	return L.marker([position.latitude, position.longitude], {
		icon: L.icon({
			iconUrl: '//static.icos-cp.eu/images/icons/boat.png',
			iconAnchor: [15, 22]
		})
	});
};

const getNewCenterZoom = (prevProps, center, zoom, map) => {
	const mapCenter = map.getCenter();

	if (prevProps.center === undefined || center === undefined || mapCenter === undefined) return undefined;

	const propsDiffers = prevProps.center.lat !== center.lat || prevProps.center.lng !== center.lng || prevProps.zoom !== zoom;
	const mapZoom = map.getZoom();
	const propsMapDiffers = mapCenter.lat !== center.lat || mapCenter.lng !== center.lng || mapZoom.zoom !== zoom;

	return propsDiffers && propsMapDiffers ? {center, zoom} : undefined;
};

const calculateDecimals = (min, max) => {
	return Math.abs(max - min) < 50 ? 1 : 0;
};

const resizeCB = (min, max, updateLegend) => {
	return debounce(({newSize}) => {
		const {getLegend} = colorMaker(min, max, calculateDecimals(min, max), getLegendHeight(newSize.y));
		updateLegend(newSize, getLegend);
	}, 300);
};

const getLegendHeight = mapHeight => {
	return mapHeight - 30;
};
