import React, { Component } from 'react';
import L from 'leaflet';
import {colorMaker} from '../models/colorMaker';
import CanvasLegend from '../legend/CanvasLegend';
import {legendCtrl} from '../legend/LegendCtrl';
import {debounce} from 'icos-cp-utils';


const decimals = 0;

export default class Map extends Component {
	constructor(props){
		super(props);

		this._leafletMap = undefined;
		this._mapElement = undefined;
		this._legendCtrl = undefined;
		this._countriesTopoLayer = undefined;

		this._eventHandlers = [];
	}

	addEvent(type, fn){
		this._leafletMap.on(type, fn);
		this._eventHandlers.push({type, fn});
	}

	clearEvents(){
		this._eventHandlers.forEach(eh => this._leafletMap.off(eh.type, eh.fn));
	}

	componentDidMount(){
		this._leafletMap = createNewMap(this._mapElement);
	}

	componentDidUpdate(){
		const {statsMap} = this.props;

		if (statsMap.isReadyForMapUpdate) {
			this.showStats(statsMap);
		}
	}

	updateLegend(newSize, getLegend){
		const canvasLegend = new CanvasLegend(getLegendHeight(newSize.y), getLegend);
		this._legendCtrl.update(canvasLegend.renderLegend());
	}

	showStats(statsMap){
		const map = this._leafletMap;
		const mapSize = map.getSize();
		const min = statsMap.minCount;
		const max = statsMap.maxCount;
		const {getColor, getLegend} = colorMaker(min, max, decimals, getLegendHeight(mapSize.y));

		if (this._countriesTopoLayer !== undefined){
			map.removeLayer(this._countriesTopoLayer);
		}

		this._countriesTopoLayer = L.geoJSON(statsMap.countriesTopo, {
			filter: feature => {
				return statsMap.countryStats.some(stat => stat._id === feature.properties.iso2);
			},
			style: feature => {
				const count = statsMap.getCount(feature.properties.iso2);
				return {
					weight: 1,
					color: 'black',
					fillColor: `rgb(${getColor(count).join(',')})`,
					fillOpacity: 0.5
				};
			}
		}).bindTooltip(e =>
			`<b>${e.feature.properties.name}<br><b>Downloads: </b>${statsMap.getCount(e.feature.properties.iso2)}`
			, {sticky: true});

		map.addLayer(this._countriesTopoLayer);

		if (this._legendCtrl === undefined) {
			const canvasLegend = new CanvasLegend(getLegendHeight(mapSize.y), getLegend);
			this._legendCtrl = legendCtrl(canvasLegend.renderLegend());
			map.addControl(this._legendCtrl);
		} else {
			this.updateLegend(mapSize, getLegend);
		}

		const updateLegend = this.updateLegend.bind(this);
		this.clearEvents();
		this.addEvent('resize', resizeCB(min, max, updateLegend));
	}

	componentWillUnmount() {
		this.clearEvents();
		this._leafletMap = null;
	}

	render(){
		return (
			<div>
				<div
					ref={div => this._mapElement = div} id="map"
					style={{
						width: '100%',
						paddingTop: '75%',
						margin: 0,
						border: '1px solid #ddd',
						borderRadius: '4px'
					}}
				/>
			</div>
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

const createNewMap = mapElement => {
	const map = L.map(
		mapElement.id,
		{
			preferCanvas: true,
			attributionControl: false,
			center: [10, 0],
			zoom: 1
		}
	);

	const url = '//server.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
	const baseMap = L.tileLayer(window.location.protocol + url, {
		maxZoom: 18
	});

	map.addLayer(baseMap);

	return map;
};
