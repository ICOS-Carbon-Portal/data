import Control from 'ol/control/control';
import {saveAs} from 'file-saver';

export default class ExportControl extends Control {
	constructor(rootElement, options = {}){
		super(rootElement);

		this._map = undefined;

		Control.call(this, {
			element: rootElement,
			target: options.target
		});

		const switchBtn = document.createElement('button');
		switchBtn.setAttribute('class', 'dl');

		const content = document.createElement('div');
		content.setAttribute('style', 'display: none;');

		switchBtn.addEventListener('mouseenter', e => {
			switchBtn.setAttribute('style', 'display: none;');
			content.setAttribute('style', 'display: inline;');
		});
		content.addEventListener('mouseout', e => {
			if (!content.contains(e.toElement || e.relatedTarget)) {
				switchBtn.setAttribute('style', 'display: inline;');
				content.setAttribute('style', 'display: none;');
			}
		});
		this.element.appendChild(switchBtn);

		const printBtn = document.createElement('button');
		printBtn.setAttribute('class', 'dl-action');
		printBtn.innerHTML = "Export map to image";

		printBtn.addEventListener('click', () => {
			if (this._map === undefined) {
				throw new Error("Map is undefined");
			}

			try {
				const isFileSaverSupported = !!new Blob;
			} catch (e) {
				throw new Error("Blob is not supported in your browser");
			}

			this._map.once('postcompose', event => {
				const canvas = event.context.canvas;
				if (navigator.msSaveBlob) {
					navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
				} else {
					canvas.toBlob(blob => {
						saveAs(blob, 'map.png');
					});
				}
			});
			this._map.renderSync();
			return false;
		});

		content.appendChild(printBtn);
		this.element.appendChild(content);
	}

	setMap(map){
		super.setMap(map);
		this._map = map;
	}
}