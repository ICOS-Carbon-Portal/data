import proj from 'ol/proj';
import CanvasMap from 'ol/canvasmap';
import View from 'ol/view';
import Overlay from 'ol/overlay';
import VectorSource from 'ol/source/vector';
import VectorLayer from 'ol/layer/vector';
import GeoJSON from 'ol/format/geojson';
import Feature from 'ol/feature';
import Point from 'ol/geom/point';
import Polygon, {fromExtent} from 'ol/geom/polygon';
import Select from 'ol/interaction/select';
import condition from 'ol/events/condition';
import Popup from './models/Popup';
import Stroke from "ol/style/stroke";
import Style from "ol/style/style";


const defaultMapOptions = {
	// Initial zoom level
	zoom: 4,
	// Fit view (defined in getViewParams) on initial load (overrides zoom and center)
	fitView: true,
	popupEnabled: true,
	// What key in props to use for popup header
	popupHeader: 'Short_name',
	// What keys in props to use for popup
	popupProps: ['Country', 'Site_type', 'Long_name', 'PI_names'],
	// Should a popup slide map so it fits the popup
	autoPan: false,
	// Radius in pixels around mouse position where features should be selected for popup
	hitTolerance: 5
};

export default class OL{
	constructor(projection, layers = [], controls = [], countryLookup, mapOptions){
		this._projection = projection;
		this._layers = layers;
		this._controls = controls;
		this._layerControl = undefined;
		this._exportControl = undefined;
		this._mapOptions = Object.assign(defaultMapOptions, mapOptions);
		this._viewParams = getViewParams(projection.getCode());
		this._map = undefined;
		this._points = [];

		this.initMap(countryLookup);
	}

	initMap(countryLookup){
		const view = new View({
			projection: this._projection,
			center: this._mapOptions.center || this._viewParams.initCenter,
			zoom: this._mapOptions.zoom,
			extent: this._viewParams.extent
		});

		const pp = this._mapOptions.popupEnabled
			? new Popup('popover', this._mapOptions.popupProps, countryLookup)
			: undefined;
		const popup = this._mapOptions.popupEnabled
			? new Overlay({
				element: pp.popupElement,
				autoPan: this._mapOptions.autoPan,
				autoPanAnimation: {
					duration: 250
				}
			})
			: undefined;
		const overlays = this._mapOptions.popupEnabled ? [popup] : [];

		this._map = new CanvasMap({
			target: 'map',
			view,
			layers: this._layers,
			overlays,
			controls: this._controls
		});

		if (this._mapOptions.popupEnabled) {
			this.addPopup(popup, pp);
		}

		if (this._mapOptions.fitView) {
			view.fit(this._viewParams.extent);
		}
	}

	addPopup(popup, pp){
		const map = this._map;
		const select = new Select({
			condition: condition.pointerMove,
			layers: layer => layer.get('interactive'),
			multi: true,
			hitTolerance: this._mapOptions.hitTolerance,
			wrapX: false
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

						pp.addObject("Station information for " + props[this._mapOptions.popupHeader], props);
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
				pp.addObject("Station information for " + props[this._mapOptions.popupHeader], props);
				popup.setPosition(e.coordinate);
			}
		});
	}

	addGeoJson(name, layerType, visible = true, geoJson, style, interactive = true){
		const jsonFeatures = (new GeoJSON()).readFeatures(geoJson, {
			dataProjection: 'EPSG:4326',
			featureProjection: this._projection
		});

		const vectorLayer = new VectorLayer({
			name,
			layerType,
			visible,
			interactive,
			extent: this._viewParams.extent,
			source: new VectorSource({
				features: jsonFeatures
			}),
			style
		});

		this._map.addLayer(vectorLayer);
	}

	addPoints(name, layerType, points, style, renderOrder){
		this._points = this._points.concat(points);

		const vectorSource = new VectorSource({
			features: points.map(p => new Feature({
				id: p.id,
				type: p.type,
				geometry: new Point(p.point, 'XY')
			}))
		});

		const vectorLayer = new VectorLayer({
			name,
			layerType,
			interactive: true,
			extent: this._viewParams.extent,
			renderOrder,
			source: vectorSource,
			style
		});

		this._map.addLayer(vectorLayer);
	}

	outlineExtent(projection){
		const rectCoords = getViewParams(projection.getCode()).rect;
		const rect = [
			[rectCoords[0], rectCoords[1]],
			[rectCoords[2], rectCoords[3]],
			[rectCoords[4], rectCoords[5]],
			[rectCoords[6], rectCoords[7]],
			[rectCoords[8], rectCoords[9]],
		];

		const vectorSource = new VectorSource({
			features: [new Feature({geometry: new Polygon([rect])})]
		});

		const vectorLayer = new VectorLayer({
			source: vectorSource,
			style: new Style({
				stroke: new Stroke({
					color: 'rgb(100,100,100)',
					width: 1
				})
			}),
			zIndex: 99
		});

		this._map.addLayer(vectorLayer);
	}
}

export const getViewParams = epsgCode => {
	const bBox4326 = [[-180, -90], [180, 90]];
	const bBox3857 = [[-20026376.39, -20048966.10], [20026376.39, 20048966.10]];
	const bBox3035 = [[1896628.618, 1330000], [7058042.778, 6827128.02]];

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
				extent: [bBox3035[0][0], bBox3035[0][1], bBox3035[1][0], bBox3035[1][1]],
				rect:[
					bBox3035[0][0], bBox3035[0][1],
					bBox3035[0][0], bBox3035[1][1],
					bBox3035[1][0], bBox3035[1][1],
					bBox3035[1][0], bBox3035[0][1],
					bBox3035[0][0], bBox3035[0][1]
				],
			};

		default:
			throw new Error('Unsupported projection: ' + epsgCode);
	}
};
