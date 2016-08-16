import BboxMapping from './BboxMapping';

export default class TileMappingHelper{
	constructor(datasetMapping, worldBox){
		this._mappings = datasetMapping.rebaseTo(worldBox);
		this._worldBox = worldBox;
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

