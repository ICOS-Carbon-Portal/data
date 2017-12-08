import Control from 'ol/control/control';

export default class LayerControl extends Control {
	constructor(rootElement, options = {}){
		super(rootElement);

		this.name = 'layerControl';
		this._layerGroups = [];
		this._layerCount = () => this._layerGroups.reduce((length, lg) => {
			return length + lg.layers.length;
		}, 0);

		Control.call(this, {
			element: rootElement,
			target: options.target
		});
	}

	setMap(map){
		super.setMap(map);
		map.on('postrender', e => {
			const mapLayers = map.getLayers().getArray().filter(ml => ml.get('name'));

			if (mapLayers.length > this._layerCount()) {
				// console.log({e, mapLayers, mapLayerCount: mapLayers.length, layerCount: this._layerCount()});
				const layerSet = new Set();
				const layerGroups = [];

				mapLayers.forEach(l => {
					if (l.get('name')) {
						if (layerSet.size === layerSet.add(l.get('name')).size) {
							layerGroups.find(lg => lg.name === l.get('name')).layers.push(l);
						} else {
							layerGroups.push({
								name: l.get('name'),
								ctrlType: l.get('ctrlType'),
								layers: [l]
							});
						}
					}
				});
				this._layerGroups = layerGroups;
				// console.log({layerGroups, count: this._layerCount()});
				this.updateCtrl();
			}
		});
	}

	updateCtrl(){
		console.log({updateCtrl: this, map: this.getMap(), layerGroups: this._layerGroups});
		this.element.innerHTML ='';

		this._layerGroups.forEach(lg => {
			if (lg.ctrlType === 'checkBx'){
				const row = document.createElement('div');
				const id = 'checkBx' + lg.name.replace(/ /g, "_");

				const checkBx = document.createElement('input');
				checkBx.setAttribute('id', id);
				checkBx.setAttribute('type', 'checkbox');
				if (lg.layers[0].getVisible()) {
					checkBx.setAttribute('checked', 'true');
				}
				checkBx.addEventListener('change', () => this.toggleLayerGroup(checkBx.checked, lg.name));
				row.appendChild(checkBx);

				const lbl = document.createElement('label');
				lbl.setAttribute('for', id);
				lbl.innerHTML = lg.name;
				row.appendChild(lbl);

				this.element.appendChild(row);
			}
			// const layerEl = document.createElement('div');
			// layerEl.innerHTML = lg.name;
			// this.element.appendChild(layerEl);
		});
	}

	toggleLayerGroup(checked, name){
		const layerGroup = this._layerGroups.find(lg => lg.name === name);
		layerGroup.layers.forEach(layer => layer.setVisible(checked));
	}
}