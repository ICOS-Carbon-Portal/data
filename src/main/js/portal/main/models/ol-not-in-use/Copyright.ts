import * as olProj from 'ol/proj';
import * as olExtent from 'ol/extent';
import Projection from 'ol/proj/Projection';
import { View } from 'ol';
import { TileLayerExtended } from './baseMaps';
import {getJson} from "icos-cp-backend";

// https://developers.arcgis.com/terms/attribution/
export default class Copyright {
	private readonly attributionElement: HTMLElement;
	public readonly isInitialized: boolean;

	constructor(private readonly attributionESRI: any, private readonly projection: Projection, htmlElementId: string, private readonly minWidth: number) {
		const attributionElement = document.getElementById(htmlElementId);
		if (attributionElement === null) {
			console.error(`Could not find html element with id = ${htmlElementId} in DOM. Attribution is disabled.`);
			this.isInitialized = false;
			this.attributionElement = document.createElement('i');

		} else {
			this.isInitialized = true;
			this.attributionElement = attributionElement;
		}
	}

	getAttribution(bbox: olExtent.Extent, serviceName: string, zoom: number = 1) {
		const projectedExtent = this.projection.getCode() === 'EPSG:4326'
			? bbox
			: olProj.transformExtent(bbox, this.projection, olProj.get('EPSG:4326'));

		const filteredAttributions = this.attributionESRI[serviceName].contributors.filter((contributor: { coverageAreas: any[]; }) => {
			return contributor.coverageAreas.some(coverage => {
				const coverageExtent: olExtent.Extent = [coverage.bbox[1], coverage.bbox[0], coverage.bbox[3], coverage.bbox[3]];
				return zoom >= coverage.zoomMin && zoom <= coverage.zoomMax && olExtent.intersects(projectedExtent, coverageExtent);
			});
		});

		return filteredAttributions
			.sort((attr: { coverageAreas: { score: any; }[]; }) => attr.coverageAreas[0].score)
			.map((attr: { attribution: any; }) => attr.attribution);
	}

	updateAttribution(view: View, layers: TileLayerExtended[]) {
		const width = document.getElementsByTagName('body')[0].getBoundingClientRect().width;
		if (width < this.minWidth) return;

		const currentBasemap = layers.find(layer => layer.getVisible() && layer.get('layerType') === 'baseMap');
		const isEsri = currentBasemap?.get('isEsri');
		let attributionText = '';
		const esriServiceName = currentBasemap
			? currentBasemap.get('esriServiceName')
			: undefined;

		if (esriServiceName) {
			const attributions = this.getAttribution(view.calculateExtent(), esriServiceName, view.getZoom());
			attributionText = attributions.join(', ');

		} else if (currentBasemap) {
			const source = currentBasemap.getSource();

			if (source.getAttributions() === null)
				return;

			const attributions = source.getAttributions()(undefined!);
			attributionText = Array.isArray(attributions) ? attributions.join(', ') : attributions;

		}

		const poweredByESRI = isEsri
			? attributionText.length > 0 ? 'Powered by ESRI - ' : 'Powered by ESRI'
			: '';
		this.attributionElement.innerHTML = poweredByESRI + attributionText;
	}
}

export const getESRICopyRight = (services: (string | undefined)[]) => {
	if (services.length === 0) return Promise.resolve({});

	const promises = services.map(service => getJson('https://static.arcgis.com/attribution/' + service + '?f=json'));

	return Promise.all(promises).then(results => {
		return results.reduce((acc, doc, idx) => {
			acc[services[idx]!] = doc;
			return acc;
		}, {});
	});
};
