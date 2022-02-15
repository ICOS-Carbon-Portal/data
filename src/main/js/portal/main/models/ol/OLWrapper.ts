import Map from 'ol/Map';
import View, { ViewOptions } from 'ol/View';
import Overlay from 'ol/Overlay';
import Style from "ol/style/Style";
import { BaseMapName, TileLayerExtended } from './baseMaps';
import Projection from 'ol/proj/Projection';
import { EpsgCode, getViewParams, SupportedSRIDs } from './projections';
import BaseLayer, { Options } from 'ol/layer/Base';
import Popup from './Popup';
import Control from 'ol/control/Control';
import { LayerControl } from './LayerControl';
import Copyright from './Copyright';
import { Dict } from '../../../../common/main/types';
import { Coordinate } from 'ol/coordinate';
import { geoJsonToLayer, pointsToLayer } from './utils';
import { CountriesTopo } from '../../backend';
import { Extent } from 'ol/extent';


export interface PersistedMapProps<BMN = BaseMapName> {
	srid?: SupportedSRIDs
	center?: Coordinate
	zoom?: number
	baseMapName?: BMN
	visibleToggles?: string[]
}

type OurProps = {
	mapRootelement: HTMLElement
	projection: Projection
	tileLayers: TileLayerExtended[]
	controls?: Control[]
	popupTemplate?: Popup
	mapOptions: Dict<any>
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
	attributes: Dict<string | number | Date | boolean>
}
export type LayerOptions = Options | Dict<string | Date | boolean | number>
export type UpdateMapCenterZoom = (center?: Coordinate, zoom?: number) => void
export type LayerWrapper = {
	id: string
	layerType: 'baseMap' | 'toggle'
	geoType: 'point' | 'geojson'
	name: string
	layerProps: Dict
	visible: boolean
	data: PointData[] | CountriesTopo
	style: Style | Style[]
	options: LayerOptions
}

export default class OLWrapper {
	public projection: Projection;
	private readonly tileLayers: TileLayerExtended[];
	private readonly controls: Control[];
	public readonly mapOptions: ViewOptions & MapOptions;
	public readonly viewParams: ReturnType<typeof getViewParams>;
	public map: Map;
	public readonly popupOverlay?: Overlay;

	constructor({ mapRootelement, projection, tileLayers = [], controls = [], popupTemplate, mapOptions, updatePersistedMapProps }: OurProps) {
		this.projection = projection;
		this.tileLayers = tileLayers;
		this.controls = controls;
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

	destroyMap() {
		this.map.setTarget(undefined);
	}

	addGeoJson(layer: LayerWrapper, epsgCodeForData: EpsgCode, projection: Projection, extent: Extent) {
		const vectorLayer = geoJsonToLayer(layer, epsgCodeForData, projection, extent);
		this.map.addLayer(vectorLayer);
	}

	addPoints(layer: LayerWrapper) {
		const vectorLayer = pointsToLayer(layer, this.viewParams.extent);
		this.map.addLayer(vectorLayer);
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

	addToggleLayers(toggleLayers: LayerWrapper[]) {
		toggleLayers.forEach(tl => {
			if (tl.geoType === 'point') {
				this.removeLayers((layer: BaseLayer) => layer.get('id') === tl.id);
				this.addPoints(tl);

			} else if (tl.geoType === 'geojson') {
				if (Array.isArray(tl.data)) {

				} else {
					this.addGeoJson(tl, 'EPSG:4326', this.projection, this.viewParams.extent);
				}
			}
		});
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
