export default class PointReducer{
	constructor(map, binTableData, valueIdx, maxPointsInMap, percentSD){
		this._map = map;
		this._binTableData = binTableData;
		this._valueIdx = valueIdx;
		this._maxPointsInMap = maxPointsInMap;
		this._percentSD = percentSD;
		this._stats = {min: Infinity, max: -Infinity, data: [], sum: 0, mean: undefined, sd: undefined};

		this._latIdx = binTableData.indices.latitude;
		this._lngIdx = binTableData.indices.longitude;
		this._dateIdx = binTableData.indices.date;

		this._bounds = {};
		this._pointsInBbox = [];
		this._reducedPoints = [];

		this.main();
	}

	main(){
		this.calculateBounds();
		this.getPointsInBbox();
		this.calculateStatistics();
		this.getReducedPoints();

		delete this._map;
		delete this._binTableData;
		delete this._bounds;
		delete this._valueIdx;
		delete this._maxPointsInMap;
		delete this._percentSD;
		delete this._pointsInBbox;
	}

	calculateBounds(){
		const mapBounds = this._map.getBounds();
		const latMin = mapBounds.getSouth() < -85.06 ? -85.06 : mapBounds.getSouth();
		const latMax = mapBounds.getNorth() > 85.06 ? 85.06 : mapBounds.getNorth();
		const lngMin = mapBounds.getWest();
		const lngMax = mapBounds.getEast();

		this._bounds = {latMin, latMax, lngMin, lngMax};
	}

	getPointsInBbox(){
		this._pointsInBbox = this._binTableData.allData.reduce((acc, curr, originalIdx) => {
			if (curr[this._latIdx] >= this._bounds.latMin
					&& curr[this._latIdx] <= this._bounds.latMax
					&& curr[this._lngIdx] >= this._bounds.lngMin
					&& curr[this._lngIdx] <= this._bounds.lngMax
					&& !isNaN(curr[this._valueIdx])){
				this._stats.min = Math.min(this._stats.min, curr[this._valueIdx]);
				this._stats.max = Math.max(this._stats.max, curr[this._valueIdx]);
				this._stats.sum += curr[this._valueIdx];
				this._stats.data.push(curr[this._valueIdx]);
				acc.push(curr.concat([originalIdx]));
			}

			return acc;
		}, []);
	}

	calculateStatistics(){
		this._stats.mean = this._stats.sum / this._pointsInBbox.length;
		const sqrdSum = this._stats.data.reduce((acc, curr) => {
			acc += Math.pow(curr - this._stats.mean, 2);
			return acc;
		}, 0);
		this._stats.sd = Math.sqrt(sqrdSum / this._stats.data.length);
		delete this._stats.sum;
		delete this._stats.data;
	}

	getReducedPoints(){
		const factor = Math.ceil(this._pointsInBbox.length / this._maxPointsInMap);

		this._reducedPoints = this._pointsInBbox.filter((p, idx) => {
			return idx === 0
				|| this._pointsInBbox.length <= this._maxPointsInMap
				|| idx % factor === 0
				|| Math.abs(this._pointsInBbox[idx - 1][this._valueIdx] - p[this._valueIdx]) > this._stats.sd * this._percentSD;
		});
	}

	get reducedPoints(){
		return this._reducedPoints;
	}

	get latIdx(){
		return this._latIdx;
	}

	get lngIdx(){
		return this._lngIdx;
	}

	get dateIdx(){
		return this._dateIdx;
	}

	get stats(){
		return this._stats;
	}
}