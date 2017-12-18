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
			const map = this._map;

			if (map === undefined) {
				throw new Error("Map is undefined");
			}

			try {
				const isFileSaverSupported = !!new Blob;
			} catch (e) {
				throw new Error("Blob is not supported in your browser");
			}

			map.once('postcompose', event => {
				const mapCanvas = event.context.canvas;
				const canvas = document.createElement('canvas');
				canvas.width = mapCanvas.width;
				canvas.height = mapCanvas.height;
				const toggleLayers = map.getLayers().getArray().filter(l => l.get('layerType') === 'toggle');

				const ctx = canvas.getContext('2d');
				// Copy map image to canvas
				ctx.drawImage(mapCanvas, 0, 0);
				// Draw legend rectangle
				ctx.fillStyle = 'rgb(211, 211, 211)';
				ctx.border = '1px solid black';
				ctx.fillRect(1, 1, 180, 95);
				ctx.strokeRect(1, 1, 180, 95);

				let dx;
				let dy = 15;

				// Legend text style
				ctx.font = '14px Arial';
				ctx.fillStyle = 'black';
				ctx.textBaseline = 'middle';

				toggleLayers.forEach(l => {
					const style = l.getStyle();
					const image = style ? style.getImage() : undefined;
					const canvasImage = image ? image.canvas_ : undefined;

					if (canvasImage) {
						// Id is set in LayerControl
						const txt = canvasImage.id.replace('canvas', '').replace('_', ' ');
						// Create a copy of legend icon
						const canvasImageCopy = document.createElement('canvas');
						canvasImageCopy.width = canvasImage.width;
						canvasImageCopy.height = canvasImage.height;
						const canvasImageCopyCtx = canvasImage.getContext('2d');
						canvasImageCopyCtx.drawImage(canvasImage, 0, 0);

						const imageData = canvasImageCopyCtx.getImageData(0, 0, canvasImage.width, canvasImage.height);

						// Set gray background on legend icon
						setBgColor(imageData.data, 211);

						// Add legend icon and text
						dx = 13 - canvasImage.width / 2;
						ctx.putImageData(imageData, dx, dy - canvasImage.height / 2);
						ctx.fillText(txt, 23, dy);

						dy += 22;
					}
				});

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

const setBgColor = (data, val) => {
	for (let i=0; i<data.length; i+=4){
		if (data[i+3] < 255){
			data[i] = val;
			data[i+1] = val;
			data[i+2] = val;
			data[i+3] = val;
		}
	}
};
