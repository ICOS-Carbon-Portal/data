import proj from 'ol/proj';
import CanvasMap from 'ol/canvasmap';
import View from 'ol/view';
import Overlay from 'ol/overlay';
import OSM from 'ol/source/osm';
import XYZ from 'ol/source/xyz';
import TileJSON from 'ol/source/tilejson';
import VectorSource from 'ol/source/vector';
import Tile from 'ol/layer/tile';
import VectorLayer from 'ol/layer/vector';
import GeoJSON from 'ol/format/geojson';
import Feature from 'ol/feature';
import Point from 'ol/geom/point';
import Select from 'ol/interaction/select';
import condition from 'ol/events/condition';
import Popup from './models/Popup';


const defaultMapOptions = {
	// Initial zoom level
	zoom: 4,
	// Radius in pixels around given position where features should be selected
	hitTolerance: 5,
	popupEnabled: true
};

export default class OL{
	constructor(projection, layers = [], mapOptions, popupElement){
		this._projection = projection;
		this._layers = layers;
		this._mapOptions = Object.assign(defaultMapOptions, mapOptions);
		this._popupElement = popupElement;
		this._viewParams = getViewParams(projection.getCode());
		this._map = undefined;
		this._points = [];

		this.initMap();
	}

	initMap(){
		const view = new View({
			projection: this._projection,
			center: this._viewParams.initCenter,
			zoom: this._mapOptions.zoom
		});

		const pp = new Popup('popover', countries);
		const popup = new Overlay({
			element: pp.popupElement,
			autoPan: true,
			autoPanAnimation: {
				duration: 250
			}
		});

		const map = this._map = new CanvasMap({
			target: 'map',
			view,
			layers: this._layers,
			overlays: [popup]
		});

		if (this._mapOptions.popupEnabled) {
			this.addPopup(popup, pp);
		}

		// view.fit(this._viewParams.extent);
	}

	addPopup(popup, pp){
		const map = this._map;
		const select = new Select({
			condition: condition.pointerMove,
			layers: layer => layer.get('interactive'),
			multi: true,
			hitTolerance: this._mapOptions.hitTolerance
		});
		map.addInteraction(select);

		select.on('select', e => {
			const features = e.target.getFeatures();

			if (features.getLength()) {
				pp.reset();

				for (let [idx, f] of features.getArray().entries()){
					if (idx <= 1){
						const id = f.get('id');
						const type = f.get('type');
						const props = type === 'point'
							? this._points.find(props => props.id === id)
							: f.getProperties();

						pp.addObject("Station information for " + props.Short_name, props);
					} else {
						pp.addTxt(`Zoom in to see ${features.getLength() - 2} more`);
						return;
					}
				}

				popup.setPosition(e.mapBrowserEvent.coordinate);
			} else {
				popup.setPosition(undefined);
			}
		});

		map.on('pointermove', e => {
			const pixel = map.getEventPixel(e.originalEvent);
			const f = map.forEachFeatureAtPixel(pixel, (feature, layer) => feature);

			if (popup.getPosition()) {
				popup.setPosition(e.coordinate);

			} else if (f && f.get('id')){
				const id = f.get('id');
				const type = f.get('type');
				const props = type === 'point'
					? this._points.find(props => props.id === id)
					: f.getProperties();

				pp.reset();
				pp.addObject("Station information for " + props.Short_name, props);
				popup.setPosition(e.coordinate);
			}
		});
	}

	addGeoJson(geoJson, style, interactive = true){
		const jsonFeatures = (new GeoJSON()).readFeatures(geoJson, {
			dataProjection: 'EPSG:4326',
			featureProjection: this._projection
		});

		const vectorLayer = new VectorLayer({
			interactive,
			source: new VectorSource({
				features: jsonFeatures
			}),
			style
		});

		this._map.addLayer(vectorLayer);
	}

	addPoints(points, style, renderOrder){
		this._points = this._points.concat(points);

		const vectorSource = new VectorSource({
			features: points.map(p => new Feature({
				id: p.id,
				type: p.type,
				geometry: new Point(p.point, 'XY')
			}))
		});

		const vectorLayer = new VectorLayer({
			interactive: true,
			renderOrder,
			source: vectorSource,
			style
		});

		this._map.addLayer(vectorLayer);
	}
}

const getViewParams = epsgCode => {
	const bBox4326 = [[-180, -90], [180, 90]];
	const bBox3857 = [[-20026376.39, -20048966.10], [20026376.39, 20048966.10]];
	const bBox3035 = [[1896628.62, 1507846.05], [4656644.57, 6827128.02]];

	switch (epsgCode){
		case 'EPSG:4326':
			return {
				initCenter: [0, 20],
				extent: [bBox4326[0][0], bBox4326[0][1], bBox4326[1][0], bBox4326[1][1]]
			};

		case 'EPSG:3857':
			return {
				initCenter: proj.fromLonLat([0, 20], 'EPSG:3857'),
				extent: [bBox3857[0][0], bBox3857[0][1], bBox3857[1][0], bBox3857[1][1]]
			};

		case 'EPSG:3035':
			return {
				initCenter: [4321000, 3210000],
				extent: [bBox3035[0][0], bBox3035[0][1], bBox3035[1][0], bBox3035[1][1]]
			};

		default:
			throw new Error('Unsupported projection: ' + epsgCode);
	}
};
