import Map from 'ol/Map';
import View, { ViewOptions } from 'ol/View';
import Overlay from 'ol/Overlay';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON, { GeoJSONFeatureCollection } from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from "ol/style/Style";
import { BaseMapName, TileLayerExtended } from './baseMaps';
import Projection from 'ol/proj/Projection';
import { EpsgCode, getViewParams, SupportedSRIDs } from './projections';
import predefinedStyles from './styles';
import GeometryLayout from 'ol/geom/GeometryLayout';
import BaseLayer, { Options } from 'ol/layer/Base';
import Popup from './Popup';
import Control from 'ol/control/Control';
import { LayerControl } from './LayerControl';
import Copyright from './Copyright';
import { Obj } from '../../../../common/main/types';
import { Coordinate } from 'ol/coordinate';

export type PersistedMapProps = {
	srid?: SupportedSRIDs
	center?: Coordinate
	zoom?: number
	baseMapName?: BaseMapName
}

type OurProps = {
	mapRootelement: HTMLElement
	projection: Projection
	tileLayers: TileLayerExtended[]
	controls?: Control[]
	popupTemplate?: Popup
	mapOptions: Obj<any>
	updatePersistedMapProps?: (mapProps: PersistedMapProps) => void
}
export type MapOptions = typeof defaultMapOptions
const defaultMapOptions = {
	// Initial zoom level
	zoom: 4,
	// Fit view on initial load (overrides zoom and center)
	fitView: true,
	// Should a popup slide map so it fits the popup
	autoPan: false,
	// Radius in pixels around mouse position where features should be selected for popup
	hitTolerance: 5,
};
export type PointData = {
	coord: number[] | [number, number]
	attributes: Obj<string | number | Date | boolean>
}
export type LayerOptions = Options & Obj<string | Date | boolean | number>
export type UpdateMapCenterZoom = (center?: Coordinate, zoom?: number) => void

export default class OLWrapper {
	public projection: Projection;
	private readonly tileLayers: TileLayerExtended[];
	private readonly controls: Control[];
	private readonly layerCtrl: LayerControl;
	public readonly mapOptions: ViewOptions & MapOptions;
	private readonly viewParams: ReturnType<typeof getViewParams>;
	public map: Map;
	public readonly popupOverlay?: Overlay;

	constructor({ mapRootelement, projection, tileLayers = [], controls = [], popupTemplate, mapOptions, updatePersistedMapProps }: OurProps) {
		this.projection = projection;
		this.tileLayers = tileLayers;
		this.controls = controls;
		this.layerCtrl = controls.find(ctrl => ctrl instanceof LayerControl) as LayerControl;
		this.mapOptions = { ...defaultMapOptions, ...mapOptions };
		this.viewParams = getViewParams(projection.getCode() as EpsgCode);

		this.popupOverlay = popupTemplate
			? popupTemplate.popupOverlay ?? new Overlay({
				element: popupTemplate.popupElement,
				autoPan: this.mapOptions.autoPan,
				autoPanAnimation: {
					duration: 250
				}
			})
			: undefined;
		const overlays = this.popupOverlay ? [this.popupOverlay] : [];

		const baseMaps = tileLayers.filter(l => l.get('layerType') === 'baseMap');
		const view = new View({
			projection: this.projection,
			center: this.mapOptions.center ?? this.viewParams.initCenter,
			zoom: this.mapOptions.zoom,
			showFullExtent: true
		});

		this.map = new Map({
			target: mapRootelement,
			view,
			layers: baseMaps,
			overlays,
			controls: this.controls
		});

		if (this.mapOptions.fitView) {
			view.fit(this.viewParams.extent);
		}

		if (updatePersistedMapProps) {
			this.map.on("moveend", e => {
				const view = (e.target as Map).getView();
				updatePersistedMapProps({ center: view.getCenter(), zoom: view.getZoom() });
			});
		}
	}

	// setProjection(newSRID: SupportedSRIDs) {
	// 	this.projection = getProjection(`EPSG:${newSRID}` as EpsgCode);

	// 	const newView = new View({
	// 		projection: this.projection
	// 	});

	// 	this.map.setView(newView);
	// }

	destroyMap() {
		this.map.setTarget(undefined);
	}

	private geoJsonToFeatures(geoJsonData: GeoJSONFeatureCollection, epsgCodeForData: EpsgCode) {
		return (new GeoJSON()).readFeatures(geoJsonData, {
			dataProjection: epsgCodeForData,
			featureProjection: this.projection
		});
	}

	addGeoJson(geoJsonData: GeoJSONFeatureCollection, epsgCodeForData: EpsgCode, zIndex: number = 0) {
		const vectorSource = new VectorSource({
			features: this.geoJsonToFeatures(geoJsonData, epsgCodeForData)
		});

		const vectorLayer = new VectorLayer({
			extent: this.viewParams.extent,
			source: vectorSource,
			zIndex,
			style: predefinedStyles.lnStyle
		});

		this.map.addLayer(vectorLayer);
	}

	private pointsToFeatures(points: PointData[]) {
		return points.map(p => new Feature({
			...p.attributes,
			geometry: new Point(p.coord, GeometryLayout.XY)
		}));
	}

	addPoints(points: PointData[], layerProps: Obj, style: Style, options: LayerOptions = {}) {
		const vectorSource = new VectorSource({
			features: this.pointsToFeatures(points)
		});

		const vectorLayer = new VectorLayer({
			extent: this.viewParams.extent,
			source: vectorSource,
			...options,
			style
		});
		vectorLayer.setProperties(layerProps);

		this.map.addLayer(vectorLayer);
	}

	updatePoints(points: PointData[], layerProps: Obj, layerFilter: (layer: BaseLayer) => boolean, style: Style, options: LayerOptions = {}) {
		this.map.getLayers()
			.getArray()
			.filter(layerFilter)
			.forEach(layer => this.map.removeLayer(layer));
		
		this.addPoints(points, layerProps, style, options);
	}

	set attributionUpdater(copyright: Copyright) {
		const view = this.map.getView();
		const tileLayers = this.tileLayers;
		const layerSwitcher = this.controls.find(control => control instanceof LayerControl);
		if (!layerSwitcher) return;

		copyright.updateAttribution(view, tileLayers);

		layerSwitcher.on('change', _ => {
			copyright.updateAttribution(view, tileLayers);
		});

		this.map.on('moveend', _ => {
			copyright.updateAttribution(view, tileLayers);
		});
	}
}
