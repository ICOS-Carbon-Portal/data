import Map from 'ol/Map';
import Control from 'ol/control/Control';
import { saveAs } from 'file-saver';
import BaseLayer from "ol/layer/Base";
import BaseVectorLayer from "ol/layer/BaseVector";
import {getLayerIcon} from "./utils";
import VectorLayer from "ol/layer/Vector";

export default class ExportControl extends Control {
    private map?: Map;

    constructor(rootElement: HTMLElement){
        super({element: rootElement});

        this.map = undefined;

        Control.call(this, {
            element: rootElement
        });

        const switchBtn = document.createElement('button');
        switchBtn.setAttribute('class', 'dl');

        const content = document.createElement('div');
        content.setAttribute('style', 'display: none;');

        switchBtn.addEventListener('mouseenter', () => {
            switchBtn.setAttribute('style', 'display: none;');
            content.setAttribute('style', 'display: inline;');
        });
        content.addEventListener('mouseout', (e: MouseEvent) => {
            if (!content.contains(e.relatedTarget as Element)) {
                switchBtn.setAttribute('style', 'display: inline;');
                content.setAttribute('style', 'display: none;');
            }
        });
        this.element.appendChild(switchBtn);

        const printWithLegendBtn = document.createElement('button');
        printWithLegendBtn.setAttribute('class', 'dl-action');
        printWithLegendBtn.innerHTML = "Export map with legend";

        printWithLegendBtn.addEventListener('click', () => {
            const map = this.map;
            if (map === undefined)
                return;

            const legendWidth = 180;
            const legendHeight = 95;
            exportMap(map, getCanvases(map), true, legendWidth, legendHeight);
            return false;
        });

        content.appendChild(printWithLegendBtn);

        const spacing = document.createElement('div');
        spacing.setAttribute('style', 'height:3px;');
        spacing.innerHTML = "&nbsp;";
        content.appendChild(spacing);

        const printWithoutLegendBtn = document.createElement('button');
        printWithoutLegendBtn.setAttribute('class', 'dl-action');
        printWithoutLegendBtn.innerHTML = "Export map without legend";

        printWithoutLegendBtn.addEventListener('click', () => {
            const map = this.map;
            if (map === undefined)
                return;

            exportMap(map, getCanvases(map), false);
            return false;
        });

        content.appendChild(printWithoutLegendBtn);

        this.element.appendChild(content);
    }

    setMap(map: Map){
        super.setMap(map);
        this.map = map;
    }
}

const getCanvases = (map: Map) => {
    return Array.from(map.getTargetElement().getElementsByTagName('canvas')).filter(canvas => canvas.id === "");
};

const exportMap = (map: Map, canvases: HTMLCanvasElement[], withLegend: boolean, width?: number, height?: number) => {
    if (map === undefined) throw new Error("Map is undefined");

    try {
        const isFileSaverSupported = !!new Blob;
    } catch (e) {
        throw new Error("Blob is not supported in your browser");
    }

    const mapCanvas = canvases[0];
    const canvas = document.createElement('canvas');
    canvas.width = mapCanvas.width;
    canvas.height = mapCanvas.height;

    const ctx = canvas.getContext('2d');
    if (ctx === null)
        return;
    // Copy map image to canvas
    ctx.drawImage(mapCanvas, 0, 0);

    if (withLegend && width !== undefined && height !== undefined) {
        const toggleLayers: (BaseLayer | BaseVectorLayer)[] = map.getLayers().getArray().filter(l => l.get('layerType') === 'toggle');

        // Draw legend rectangle
        ctx.fillStyle = 'rgb(211, 211, 211)';
        // ctx.border = '1px solid black';
        ctx.fillRect(1, 1, width, height);
        ctx.strokeRect(1, 1, width, height);

        let dx;
        let dy = 15;

        // Legend text style
        ctx.font = '14px Arial';
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'middle';

        toggleLayers.forEach(l => {
            const canvasElement = getLayerIcon(l as VectorLayer);
            const canvasImageCopyCtx = canvasElement?.getContext('2d');

            if (canvasElement && canvasImageCopyCtx) {
                // title is set when creating legend for layer
                const txt = canvasElement.title;
                // Create a copy of legend icon
                const canvasImageCopy = document.createElement('canvas');
                canvasImageCopy.width = canvasElement.width;
                canvasImageCopy.height = canvasElement.height;

                canvasImageCopyCtx.drawImage(canvasElement, 0, 0);
                const imageData = canvasImageCopyCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);

                // Set gray background on legend icon
                setBgColor(imageData.data, 211);

                // Add legend icon and text
                dx = 13 - canvasElement.width / 2;
                ctx.putImageData(imageData, dx, dy - canvasElement.height / 2);
                ctx.fillText(txt, 23, dy);

                dy += 22;
            }
        });
    }

    if (navigator.hasOwnProperty('msSaveBlob')) {
        (navigator as any).msSaveBlob((canvas as any).msToBlob(), 'map.png');
    } else {
        canvas.toBlob(blob => {
            if (blob !== null)
                saveAs(blob, 'map.png');
        });
    }
};

const setBgColor = (data: Uint8ClampedArray, val: number) => {
    for (let i=0; i<data.length; i+=4){
        if (data[i+3] < 255){
            data[i] = val;
            data[i+1] = val;
            data[i+2] = val;
            data[i+3] = val;
        }
    }
};
