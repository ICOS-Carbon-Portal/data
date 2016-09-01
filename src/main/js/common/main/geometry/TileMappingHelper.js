import BboxMapping from './BboxMapping';
import Bbox from './Bbox';

export default class TileMappingHelper{
	constructor(datasetMapping, worldBox){
		this._mappings = datasetMapping.rebaseTo(worldBox);
	}

	getCoordinateMappings(tileMapping){
		let tileCoords = tileMapping._from;
		let datasetMappings = this._mappings.map(mapping => mapping.getSubMapping(tileCoords))
			.filter(mapping => !mapping.isEmpty);
		return datasetMappings.map(dsMapping => {
			let tilePixels = tileMapping.getSubMapping(dsMapping.from).to;
			let datasetPixels = dsMapping.to;
			return new BboxMapping(datasetPixels, tilePixels);
		});
	}

	getRebasedDatasetBox(){
		return this._mappings.map(m => m.from).reduce((acc, curr) => acc.join(curr));
	}

}

export function getTileCoordBbox(tilePoint, zoom){

	const tilePoint2Lon = tileNum => tileNum / Math.pow(2, zoom) * 360 - 180;
	const tilePoint2Lat = tileNum => - tilePoint2Lon(tileNum);

	const latMax = tilePoint2Lat(tilePoint.y);
	const latMin = tilePoint2Lat(tilePoint.y + 1);
	const lonMin = tilePoint2Lon(tilePoint.x);
	const lonMax = tilePoint2Lon(tilePoint.x + 1);

	return new Bbox(lonMin, latMin, lonMax, latMax);
}

