import React, { Component } from 'react';
import L from 'leaflet';
import * as LCommon from 'icos-cp-leaflet-common';
import {colorMaker} from "../models/colorMaker";
import CanvasLegend from '../legend/CanvasLegend';
import {legendCtrl} from '../legend/LegendCtrl';
import config from '../config';
import {Stats} from '../controls/Stats';
import {FullExtent} from '../controls/FullExtent';
import {debounce} from 'icos-cp-utils';


const decimals = 0;

export default class Map extends Component{
	constructor(props){
		super(props);

		this.leafletMap = undefined;
		this.textCtrl = undefined;
		this.fullExtentCtrl = undefined;
		this.legendCtrl = undefined;
		this.mapElement = undefined;
		this.layerGroup = undefined;
		this.markerGroup = undefined;
		this.moveEndFn = undefined;
		this.handleMoveEnd = this.moveEndHandler.bind(this);

		this.mapPointMouseOver = props.mapPointMouseOver;

		this.colorMaker = undefined;
	}

	componentDidMount(){
		this.createNewMap();
	}

	componentDidUpdate(prevProps){
		const {binTableData, valueIdx, afterPointsFiltered, fromGraph} = this.props;

		if (prevProps.valueIdx !== valueIdx) {
			const zoomToPoints = this.colorMaker === undefined;
			if (this.legendCtrl) this.leafletMap.removeControl(this.legendCtrl);
			this.colorMaker = undefined;

			this.addPoints(zoomToPoints, true, binTableData, valueIdx, afterPointsFiltered);
		}

		if (prevProps.fromGraph !== fromGraph) {
			this.addMarker(fromGraph);
		}
	}

	addMarker(position){
		this.markerGroup.clearLayers();
		if (position) {
			this.markerGroup.addLayer(L.marker([position.latitude, position.longitude], {
				icon: L.icon({
					iconUrl: '//static.icos-cp.eu/images/icons/boat.png',
					iconAnchor: [15, 22]
				})
			}));
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
				center: [0, 0],
				zoom: 1,
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

		this.markerGroup = L.layerGroup();
		map.addLayer(this.markerGroup);
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

		const mapBounds = map.getBounds();
		const latMin = mapBounds.getSouth() < -85.06 ? -85.06 : mapBounds.getSouth();
		const latMax = mapBounds.getNorth() > 85.06 ? 85.06 : mapBounds.getNorth();
		const lngMin = mapBounds.getWest();
		const lngMax = mapBounds.getEast();

		const stats = {min: Infinity, max: -Infinity, data: [], sum: 0, mean: undefined, sd: undefined};

		const latIdx = binTableData.indices.latitude;
		const lngIdx = binTableData.indices.longitude;
		const dateIdx = binTableData.indices.date;

		const pointsInBbox = binTableData.allData.reduce((acc, curr, originalIdx) => {
			if (curr[latIdx] >= latMin && curr[latIdx] <= latMax && curr[lngIdx] >= lngMin && curr[lngIdx] <= lngMax && !isNaN(curr[valueIdx])){
				stats.min = Math.min(stats.min, curr[valueIdx]);
				stats.max = Math.max(stats.max, curr[valueIdx]);
				stats.sum += curr[valueIdx];
				stats.data.push(curr[valueIdx]);
				acc.push(curr.concat([originalIdx]));
			}

			return acc;
		}, []);

		stats.mean = stats.sum / pointsInBbox.length;
		const sqrdSum = stats.data.reduce((acc, curr) => {
			acc += Math.pow(curr - stats.mean, 2);
			return acc;
		}, 0);
		stats.sd = Math.sqrt(sqrdSum / stats.data.length);
		delete stats.sum;
		delete stats.data;

		if (this.colorMaker === undefined) {
			const mapSize = map.getSize();
			this.colorMaker = colorMaker(stats.min, stats.max, decimals, getLegendHeight(mapSize.y));
			const canvasLegend = new CanvasLegend(getLegendHeight(mapSize.y), this.colorMaker.getLegend);
			this.legendCtrl = legendCtrl(canvasLegend.renderLegend(), {position: 'topright', showOnLoad: true});
			map.addControl(this.legendCtrl);

			this.statsCtrl.updateStats(stats);
		}
		const factor = Math.ceil(pointsInBbox.length / config.maxPointsInMap);

		const reducedPoints = pointsInBbox.filter((p, idx) => {
			return idx === 0
				|| pointsInBbox.length <= config.maxPointsInMap
				|| idx % factor === 0
				|| Math.abs(pointsInBbox[idx - 1][valueIdx] - p[valueIdx]) > stats.sd * config.percentSD;
		});

		reducedPoints.forEach(p => {
			const cm = L.circleMarker([p[latIdx], p[lngIdx]], {
				radius: 5,
				weight: 0,
				fillColor: `rgba(${this.colorMaker.getColor(p[valueIdx]).join(',')})`,
				fillOpacity: 1,
				dataCoord: {dataX: p[dateIdx], dataY: p[valueIdx], row: p[p.length - 1]}
			});

			cm.on('mouseover', e => this.mapPointMouseOver(e.target.options.dataCoord));
			cm.on('mouseout', () => this.mapPointMouseOver({dataX: undefined, dataY: undefined, row: undefined}));

			layerGroup.addLayer(cm);
		});

		if (zoomToPoints) {
			const updateLegend = this.updateLegend.bind(this);
			map.on('resize', resizeCB(stats.min, stats.max, updateLegend));

			const points = reducedPoints.map(row => [row[latIdx], row[lngIdx]]);
			map.fitBounds(points);
			this.fullExtentCtrl.updatePoints(points);
			this.handleMoveEnd(_ => this.addPoints(false, false, binTableData, valueIdx, afterPointsFiltered));
		} else if (redefineColor) {
			this.handleMoveEnd(_ => this.addPoints(false, false, binTableData, valueIdx, afterPointsFiltered));
		}

		if (afterPointsFiltered) afterPointsFiltered(reducedPoints);
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

const resizeCB = (min, max, updateLegend) => {
	return debounce(({newSize}) => {
		const {getLegend} = colorMaker(min, max, decimals, getLegendHeight(newSize.y));
		updateLegend(newSize, getLegend);
	}, 300);
};

const getLegendHeight = mapHeight => {
	return mapHeight - 30;
};
