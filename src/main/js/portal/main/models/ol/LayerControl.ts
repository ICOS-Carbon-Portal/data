import Control, { Options } from 'ol/control/Control';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import BaseLayer from 'ol/layer/Base';
import { BaseMapName } from './baseMaps';
import { findLayers } from './utils';
import { PersistedMapProps } from './OLWrapper';

export interface LayerControlOptions extends Options {
	selectedBaseMapName: BaseMapName
	updateLayerGroups?: (map: Map) => () => void
	updateCtrl: (self: LayerControl) => () => void
	updatePersistedMapProps: (mapProps: PersistedMapProps) => void
}

export type ControlLayerGroup = {
	id: string
	name: string
	layerType: 'toggle' | 'baseMap'
	layers: BaseLayer[]
	visible: boolean
}

export type ControlToggleLayer = {
	id: string
	visible: boolean
}

export class LayerControl extends Control {
	public map?: Map;
	// public layerGroups: ControlLayerGroup[];
	public controlToggleLayers: ControlToggleLayer[] = [];
	public defaultBaseMap?: TileLayer;
	// private mapLayerFilter: (ml: BaseLayer) => boolean;
	public layersDiv: HTMLDivElement;
	public updateCtrl: () => void
	public selectedBaseMap?: BaseMapName

	constructor(options: LayerControlOptions) {
		super(options);

		this.selectedBaseMap = options.selectedBaseMapName;
		this.updateCtrl = options.updateCtrl(this);

		// this.layerGroups = [];
		this.defaultBaseMap = undefined;
		
		Control.call(this, {
			element: options.element,
			target: options.target
		});

		const switchBtn = document.createElement('button');
		switchBtn.setAttribute('class', 'ol');
		this.layersDiv = document.createElement('div'); 
		this.layersDiv.setAttribute('style', 'display: none;');

		switchBtn.addEventListener('mouseenter', _ => {
			switchBtn.setAttribute('style', 'display: none;');
			this.layersDiv.setAttribute('style', 'display: inline;');
		});
		this.layersDiv.addEventListener('mouseleave', _ => {
			switchBtn.setAttribute('style', 'display: inline;');
			this.layersDiv.setAttribute('style', 'display: none;');
		});

		this.element.appendChild(switchBtn);
		this.element.appendChild(this.layersDiv);

		this.on('change', _ => options.updatePersistedMapProps({
			baseMapName: this.selectedBaseMap,
			visibleToggles: this.visibleToggleLayers
		}));
	}

	setMap(map: Map) {
		super.setMap(map);
		this.map = map;

		this.updateCtrl();
		map.getLayers().on('add', this.updateCtrl);
	}

	get baseMaps() {
		return this.map === undefined
			? []
			: findLayers(this.map, (l) => l.get('layerType') === 'baseMap');
	}

	get toggles() {
		return this.map === undefined
			? []
			: findLayers(this.map, (l) => l.get('layerType') === 'toggle');
	}

	toggleBaseMaps(baseMapNameToActivate: string) {
		this.selectedBaseMap = baseMapNameToActivate as BaseMapName;
		this.baseMaps.forEach(bm => {
			bm.setVisible(bm.get('name') === baseMapNameToActivate);
		});

		this.changed();
	}

	toggleLayers(layerId: string, checked: boolean) {
		this.map?.getLayers()
			.getArray()
			.filter(layer => layer.get('layerType') === 'toggle' && layer.get('id') === layerId)
			.forEach(layer => layer.setVisible(checked));
		
		this.changed();
	}

	get visibleToggleLayers(): string[] | undefined {
		return this.map?.getLayers()
			.getArray()
			.filter(layer => layer.get('layerType') === 'toggle' && layer.getVisible())
			.map(layer => layer.get('id'));
	}

	createId(ctrlType: 'radio' | 'toggle', name: string) {
		return ctrlType + name.replace(/ /g, "_");
	}
}
