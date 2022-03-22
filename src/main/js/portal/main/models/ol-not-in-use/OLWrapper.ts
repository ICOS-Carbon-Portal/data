import Map from 'ol/Map';
import View, { ViewOptions } from 'ol/View';
import Overlay from 'ol/Overlay';
import Style from "ol/style/Style";
import {BaseMapId, TileLayerExtended} from './baseMaps';
import Projection from 'ol/proj/Projection';
import { EpsgCode, getViewParams, SupportedSRIDs } from './projections';
import BaseLayer, { Options } from 'ol/layer/Base';
import Popup from './Popup';
import Control from 'ol/control/Control';
import { LayerControl } from './LayerControl';
import Copyright from './Copyright';
import { Coordinate } from 'ol/coordinate';
import {Dict, findLayers, geoJsonToLayer, pointsToLayer, VectorLayerExtended} from './utils';
import { Extent } from 'ol/extent';

export type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.GeometryObject, GeoJSON.GeoJsonProperties>

export interface PersistedMapProps<BMN = BaseMapId> {
	srid?: SupportedSRIDs
	center?: Coordinate
	zoom?: number
	baseMap?: BMN
	visibleToggles?: string[]
}

type OurProps = {
	mapRootElement: HTMLElement
	projection: Projection
	tileLayers: TileLayerExtended[]
	controls?: Control[]
	popupTemplate?: Popup
	mapOptions: Dict<any>
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
	attributes: Dict<string | number | Date | boolean>
}
export type LayerOptions = Options | Dict<string | Date | boolean | number>
export type LayerWrapper = {
	id: string
	layerType: 'baseMap' | 'toggle'
	geoType: 'point' | 'geojson'
	label: string
	layerProps: Dict
	visible: boolean
	data: PointData[] | GeoJsonFeatureCollection
	style: Style | Style[]
	options: LayerOptions
}

export default class OLWrapper {
	public projection: Projection;
	private readonly tileLayers: TileLayerExtended[];
	private readonly controls: Control[];
	private readonly layerCtrl?: LayerControl;
	public readonly mapOptions: ViewOptions & MapOptions;
	public readonly viewParams: ReturnType<typeof getViewParams>;
	public readonly map: Map;
	public readonly popupOverlay?: Overlay;

	constructor({ mapRootElement, projection, tileLayers = [], controls = [], popupTemplate, mapOptions }: OurProps) {
		this.projection = projection;
		this.tileLayers = tileLayers;
		this.controls = controls;
		this.layerCtrl = controls.find(ctrl => ctrl instanceof LayerControl) as LayerControl | undefined;
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
			target: mapRootElement,
			view,
			layers: baseMaps,
			overlays,
			controls: this.controls
		});

		if (this.mapOptions.fitView) {
			view.fit(this.viewParams.extent);
		}
	}

	destroyMap() {
		this.map.setTarget(undefined);
	}

	addGeoJson(layer: LayerWrapper, epsgCodeForData: EpsgCode, projection: Projection, extent: Extent) {
		const vectorLayer = geoJsonToLayer(layer, epsgCodeForData, projection, extent);
		this.map.addLayer(vectorLayer);

		return vectorLayer;
	}

	addPoints(layer: LayerWrapper) {
		const vectorLayer = pointsToLayer(layer, this.viewParams.extent);
		this.map.addLayer(vectorLayer);

		return vectorLayer;
	}

	updatePoints(layer: LayerWrapper, layerFilter: (layer: BaseLayer) => boolean) {
		this.removeLayers(layerFilter);
		this.addPoints(layer);
	}

	private removeLayers(layerFilter: (layer: BaseLayer) => boolean) {
		this.map.getLayers()
			.getArray()
			.filter(layerFilter)
			.forEach(layer => this.map.removeLayer(layer));
	}

	addToggleLayers(toggleLayers: LayerWrapper[]): VectorLayerExtended[] {
		return toggleLayers.reduce<VectorLayerExtended[]>((acc, tl) => {
			if (tl.geoType === 'point') {
				this.removeLayers((layer: BaseLayer) => layer.get('id') === tl.id);
				acc.push(this.addPoints(tl));

			} else if (tl.geoType === 'geojson') {
				this.removeLayers((layer: BaseLayer) => layer.get('id') === tl.id);
				acc.push(this.addGeoJson(tl, 'EPSG:4326', this.projection, this.viewParams.extent));
			}

			return acc;
		}, []);
	}

	get baseMaps(): BaseLayer[] {
		return findLayers(this.map, (l) => l.get('layerType') === 'baseMap');
	}

	getToggleLayers(returnOnlyVisible: boolean): BaseLayer[] {
		return findLayers(
			this.map,
			(l) => l.get('layerType') === 'toggle' && (!returnOnlyVisible || l.getVisible())
		);
	}

	set attributionUpdater(copyright: Copyright) {
		if (!copyright.isInitialized)
			return;

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
