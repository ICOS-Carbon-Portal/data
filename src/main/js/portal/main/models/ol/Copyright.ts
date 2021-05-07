import * as olProj from 'ol/proj';
import * as olExtent from 'ol/extent';
import Projection from 'ol/proj/Projection';
import { View } from 'ol';
import { TileLayerExtended } from './baseMaps';
import { fetchJson } from '../../backend';

// https://developers.arcgis.com/terms/attribution/
export default class Copyright {
	private readonly attributionElement: HTMLElement;

	constructor(private readonly attributionESRI: any, private readonly projection: Projection, htmlElementId: string, private readonly minWidth: number) {
		const attributionElement = document.getElementById(htmlElementId);
		if (attributionElement === null)
			throw new Error(`Could not find html element with id = ${htmlElementId} in DOM`);
		this.attributionElement = attributionElement;
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
		const esriServiceName = currentBasemap
			? currentBasemap.get('esriServiceName')
			: undefined;

		if (esriServiceName) {
			const attributions = this.getAttribution(view.calculateExtent(), esriServiceName, view.getZoom());
			this.attributionElement.innerHTML = attributions.join(', ');

		} else if (currentBasemap) {
			const source = currentBasemap.getSource();
			const attributions = source.getAttributions()(undefined);
			this.attributionElement.innerHTML = Array.isArray(attributions) ? attributions.join(', ') : attributions;

		} else {
			this.attributionElement.innerHTML = '';
		}
	}
}

export const getESRICopyRight = async (services: string[]) => {
	const promises = services.map(service => fetchJson<any>('https://static.arcgis.com/attribution/' + service + '?f=json'));

	return Promise.all(promises).then(results => {
		return results.reduce((acc, doc, idx) => {
			acc[services[idx]] = doc;
			return acc;
		}, {});
	});
};
