import Control, { Options } from 'ol/control/Control';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import { Obj } from '../../../../common/main/types';
import BaseLayer from 'ol/layer/Base';
import { BaseMapName } from './baseMaps';

export interface LayerControlOptions extends Options {
	mapLayerFilter: (ml: BaseLayer) => boolean
	updateLayerGroups?: (map: Map) => () => void
	updateCtrl: (self: LayerControl) => () => void
}

export type ControlLayerGroup = {
	name: string
	layerType: 'toggle' | 'baseMap'
	layers: BaseLayer[]
}

export class LayerControl extends Control {
	public layerGroups: ControlLayerGroup[];
	public defaultBaseMap?: TileLayer;
	private mapLayerFilter: (ml: BaseLayer) => boolean;
	public layersDiv: HTMLDivElement;
	private updateLayerGroups?: (map: Map) => () => void
	private updateCtrl: () => void
	public selectedBaseMap?: BaseMapName

	constructor(options: LayerControlOptions) {
		super(options);

		this.mapLayerFilter = options.mapLayerFilter;
		this.updateLayerGroups = options.updateLayerGroups;
		this.updateCtrl = options.updateCtrl(this);

		this.layerGroups = [];
		this.defaultBaseMap = undefined;
		
		Control.call(this, {
			element: options.element,
			target: options.target
		});

		const switchBtn = document.createElement('button');
		switchBtn.setAttribute('class', 'ol');
		this.layersDiv = document.createElement('div'); 
		this.layersDiv.setAttribute('style', 'display: none;');

		switchBtn.addEventListener('mouseenter', () => {
			switchBtn.setAttribute('style', 'display: none;');
			this.layersDiv.setAttribute('style', 'display: inline;');
		});
		this.layersDiv.addEventListener('mouseleave', e => {
			switchBtn.setAttribute('style', 'display: inline;');
			this.layersDiv.setAttribute('style', 'display: none;');
		});

		this.element.appendChild(switchBtn);
		this.element.appendChild(this.layersDiv);
	}

	layerCount() {
		return this.layerGroups.reduce((length, lg) => {
			return length + lg.layers.length;
		}, 0);
	}

	setDefaultBaseMap(baseMap: TileLayer) {
		this.defaultBaseMap = baseMap;
	}

	setMap(map: Map) {
		super.setMap(map);

		const updater = this.updateLayerGroups === undefined
			? this.defaultUpdateLayerGroups.bind(this)
			: this.updateLayerGroups.bind(this);
		updater(map)();
		map.getLayers().on('add', updater(map));
	}

	private defaultUpdateLayerGroups(map: Map) {
		return () => {
			const mapLayers = map.getLayers().getArray().filter(this.mapLayerFilter);

			if (mapLayers.length > this.layerCount()) {
				const layerSet = new Set();
				this.layerGroups = mapLayers.reduce<ControlLayerGroup[]>((acc, l) => {
					if (l.get('name')) {
						if (layerSet.size === layerSet.add(l.get('name')).size) {
							acc.find(lg => lg.name === l.get('name'))?.layers.push(l);
						} else {
							acc.push({
								name: l.get('name'),
								layerType: l.get('layerType'),
								layers: [l]
							});
						}
					}

					return acc;
				}, []);

				this.updateCtrl();
			}
		}
	}

	toggleBaseMaps(layerGroupFilter: (lg: ControlLayerGroup) => boolean, baseMapNameToActivate: string) {
		this.selectedBaseMap = baseMapNameToActivate as BaseMapName;
		this.layerGroups.filter(layerGroupFilter).forEach(bm => {
			bm.layers[0].setVisible(bm.name === baseMapNameToActivate);
		});

		// Signal to other components that basemap changed
		this.changed();
	}

	toggleLayerGroup(layerGroupName: string, checked: boolean) {
		const layerGroup = this.layerGroups.find(lg => lg.name === layerGroupName);
		layerGroup?.layers.forEach(layer => layer.setVisible(checked));
	}

	setChecked(searchParams: Obj, id2name: (id: string) => string) {
		const toggles = this.layerGroups.filter(lg => lg.layerType === 'toggle');

		if (searchParams.hasOwnProperty('baseMap') && searchParams.baseMap.length) {
			this.toggleInput('radio', searchParams.baseMap, true);
		} else {
			this.toggleInput('radio', this.defaultBaseMap?.get('name'), true);
		}

		if (searchParams.hasOwnProperty('show')) {
			if (searchParams.show.length) {
				const toggleNamesToShow = searchParams.show.split(',').map(id => id2name(id));

				toggles.forEach(toggle => {
					this.toggleInput('toggle', toggle.name, toggleNamesToShow.includes(toggle.name));
				});
			} else {
				toggles.forEach(toggle => {
					this.toggleInput('toggle', toggle.name, false);
				});
			}
		} else {
			toggles.forEach(toggle => {
				this.toggleInput('toggle', toggle.name, true);
			});
		}
	}

	toggleInput(ctrlType: 'radio' | 'toggle', name: string, isChecked: boolean) {
		const input = document.getElementById(this.createId(ctrlType, name)) as HTMLInputElement;
		if (input) input.checked = isChecked;
	};

	createId(ctrlType: 'radio' | 'toggle', name: string) {
		return ctrlType + name.replace(/ /g, "_");
	}
}