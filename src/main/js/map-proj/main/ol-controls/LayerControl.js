import Control from 'ol/control/control';

export default class LayerControl extends Control {
	constructor(rootElement, options = {}){
		super(rootElement);

		this._layerGroups = [];
		this._layerCount = () => this._layerGroups.reduce((length, lg) => {
			return length + lg.layers.length;
		}, 0);

		Control.call(this, {
			element: rootElement,
			target: options.target
		});

		const switchBtn = document.createElement('button');
		switchBtn.setAttribute('class', 'ol');
		this._layers = document.createElement('div');
		this._layers.setAttribute('style', 'display: none;');

		switchBtn.addEventListener('mouseenter', e => {
			switchBtn.setAttribute('style', 'display: none;');
			this._layers.setAttribute('style', 'display: inline;');
		});
		this._layers.addEventListener('mouseout', e => {
			if (!this._layers.contains(e.toElement || e.relatedTarget)) {
				switchBtn.setAttribute('style', 'display: inline;');
				this._layers.setAttribute('style', 'display: none;');
			}
		});

		this.element.appendChild(switchBtn);
		this.element.appendChild(this._layers);
	}

	setMap(map){
		super.setMap(map);
		map.on('postrender', e => {
			const mapLayers = map.getLayers().getArray().filter(ml => ml.get('name'));

			if (mapLayers.length > this._layerCount()) {
				const layerSet = new Set();
				const layerGroups = [];

				mapLayers.forEach(l => {
					if (l.get('name')) {
						if (layerSet.size === layerSet.add(l.get('name')).size) {
							layerGroups.find(lg => lg.name === l.get('name')).layers.push(l);
						} else {
							layerGroups.push({
								name: l.get('name'),
								layerType: l.get('layerType'),
								layers: [l]
							});
						}
					}
				});
				this._layerGroups = layerGroups;
				this.updateCtrl();
			}
		});
	}

	updateCtrl(){
		this._layers.innerHTML = '';
		const baseMaps = this._layerGroups.filter(lg => lg.layerType === 'baseMap');
		const toggles = this._layerGroups.filter(lg => lg.layerType === 'toggle');

		if (baseMaps.length){
			const root = document.createElement('div');
			root.setAttribute('class', 'ol-layer-control-basemaps');
			const lbl = document.createElement('label');
			lbl.innerHTML = 'Base maps';
			root.appendChild(lbl);

			baseMaps.forEach(bm => {
				const row = document.createElement('div');
				const id = 'radio' + bm.name.replace(/ /g, "_");
				row.setAttribute('class', 'row');

				const radio = document.createElement('input');
				radio.setAttribute('id', id);
				radio.setAttribute('name', 'basemap');
				radio.setAttribute('type', 'radio');
				if (bm.layers[0].getVisible()) {
					radio.setAttribute('checked', 'true');
				}
				radio.addEventListener('change', () => this.toggleBaseMaps(bm.name));
				row.appendChild(radio);

				const lbl = document.createElement('label');
				lbl.setAttribute('for', id);
				lbl.innerHTML = bm.name;
				row.appendChild(lbl);

				root.appendChild(row);
			});

			this._layers.appendChild(root);
		}

		if (toggles.length) {
			const root = document.createElement('div');
			root.setAttribute('class', 'ol-layer-control-toggles');
			const lbl = document.createElement('label');
			lbl.innerHTML = 'Layers';
			root.appendChild(lbl);

			toggles.forEach(togg => {
				const legendItem = this.getLegendItem(togg.layers[0]);
				const row = document.createElement('div');
				const id = 'toggle' + togg.name.replace(/ /g, "_");
				row.setAttribute('class', 'row');

				const toggle = document.createElement('input');
				toggle.setAttribute('id', id);
				toggle.setAttribute('type', 'checkbox');
				if (togg.layers[0].getVisible()) {
					toggle.setAttribute('checked', 'true');
				}
				toggle.addEventListener('change', () => this.toggleLayerGroup(toggle.checked, togg.name));
				row.appendChild(toggle);

				if (legendItem){
					legendItem.id = id.replace('toggle', 'canvas');
					row.appendChild(legendItem);
				}

				const lbl = document.createElement('label');
				lbl.setAttribute('for', id);
				lbl.innerHTML = togg.name;
				row.appendChild(lbl);

				root.appendChild(row);
			});

			this._layers.appendChild(root);
		}
	}

	getLegendItem(layer){
		const style = layer.getStyle();
		const image = style ? style.getImage() : undefined;
		const canvas = image ? image.canvas_ : undefined;
		return canvas;
	}

	toggleBaseMaps(baseMapNameToActivate){
		this._layerGroups.filter(lg => lg.layerType === 'baseMap').forEach(bm => {
			if (bm.name === baseMapNameToActivate){
				bm.layers[0].setVisible(true);
			} else {
				bm.layers[0].setVisible(false);
			}
		});
	}

	toggleLayerGroup(checked, name){
		const layerGroup = this._layerGroups.find(lg => lg.name === name);
		layerGroup.layers.forEach(layer => layer.setVisible(checked));
	}
}